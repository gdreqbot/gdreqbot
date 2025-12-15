import { RefreshingAuthProvider } from "@twurple/auth";
import { ChatClient, ChatClientOptions } from "@twurple/chat";
import fs, { unlink } from "fs";
import { Server } from "http";
import MapDB from "@galaxy05/map.db";
import dotenv from "dotenv";
dotenv.config({ quiet: true });

import BaseCommand from "./structs/BaseCommand";
import CommandLoader from "./modules/CommandLoader";
import Logger from "./modules/Logger";
import Database from "./modules/Database";
import Request, { ResCode } from "./modules/Request";
import config from "./config";
import PermLevels from "./structs/PermLevels";
import { Blacklist } from "./datasets/blacklist";
import { Levels } from "./datasets/levels";
import { Perm } from "./datasets/perms";
import Dashboard from "./server";
import { User } from "./structs/user";
import { Settings } from "./datasets/settings";

const tokenData = JSON.parse(fs.readFileSync(`./tokens.${config.botId}.json`, "utf-8"));
const authProvider = new RefreshingAuthProvider({
    clientId: config.clientId,
    clientSecret: config.clientSecret
});

authProvider.addUser(config.botId, tokenData);
authProvider.addIntentsToUser(config.botId, ["chat"]);

authProvider.onRefresh((userId, newTokenData) => {
    fs.writeFileSync(`./tokens.${userId}.json`, JSON.stringify(newTokenData, null, 4), "utf-8");
    new Logger().log("Refreshing token...");
});

class Gdreqbot extends ChatClient {
    commands: Map<string, BaseCommand>;
    cmdLoader: CommandLoader;
    logger: Logger;
    db: Database;
    req: Request;
    config: typeof config;
    server: Server;

    constructor(options: ChatClientOptions) {
        super(options);

        this.commands = new Map();
        this.cmdLoader = new CommandLoader();
        this.logger = new Logger();
        this.db = new Database("data.db");
        this.req = new Request();
        this.config = config;
    }
}

// ugliest workaround ever
let channels: User[] = [];
export const channelsdb = new MapDB("channels.db");

if (channelsdb.get("channels")) {
    channels = channelsdb.get("channels");
} else {
    channelsdb.set("channels", []).then(() => console.log("channels db setup"));
}

const client = new Gdreqbot({
    authProvider,
    channels: channels.map(c => c.userName)
});

const cmdFiles = fs.readdirSync("./dist/commands/").filter(f => f.endsWith(".js"));

for (const file of cmdFiles) {
    const res = client.cmdLoader.load(client, file);
    if (res) client.logger.error(res);

    delete require.cache[require.resolve(`./commands/${file}`)];
}

client.connect();

client.onConnect(async () => {
    await client.db.init();
    await new Dashboard().run(client);

    try {
        const { channel, timestamp } = require("../reboot.json");
        await client.say(channel, `Rebooted in ${((Date.now() - timestamp) / 1000).toFixed(1)} seconds.`);

        unlink("./reboot.json", () => {});
    } catch {}

    client.logger.log("Ready");
});

client.onMessage(async (channel, user, text, msg) => {
    await client.db.setDefault({ channelId: msg.channelId, channelName: channel });

    let userPerms: PermLevels;
    let blacklist: Blacklist = client.db.load("blacklist", { channelId: msg.channelId });
    let levels: Levels = client.db.load("levels", { channelId: msg.channelId });
    let sets: Settings = client.db.load("settings", { channelId: msg.channelId });

    if (msg.userInfo.userId == config.ownerId) userPerms = PermLevels.DEV;
    else if (msg.userInfo.isBroadcaster) userPerms = PermLevels.STREAMER;
    else if (msg.userInfo.isMod) userPerms = PermLevels.MOD;
    else if (msg.userInfo.isVip) userPerms = PermLevels.VIP;
    else if (msg.userInfo.isSubscriber) userPerms = PermLevels.SUB;
    else if (!blacklist.users.find(u => u.userId == msg.userInfo.userId)) userPerms = PermLevels.USER;
    else userPerms = PermLevels.BLACKLISTED;

    let isId = text.match(/\b\d{5,9}\b/);

    if (!text.startsWith(config.prefix) && isId && userPerms != PermLevels.BLACKLISTED) {
        let res = await client.req.addLevel(client, msg.channelId, { userId: msg.userInfo.userId, userName: msg.userInfo.userName }, isId[0]);
            
        switch (res.status) {
            case ResCode.NOT_FOUND: {
                client.say(channel, "Kappa Couldn't find a level matching that ID (is it unlisted?)", { replyTo: msg });
                break;
            }

            case ResCode.ALREADY_ADDED: {
                client.say(channel, "Kappa That level is already in the queue.", { replyTo: msg });
                break;
            }

            case ResCode.MAX_PER_USER: {
                client.say(channel, `Kappa You have the max amount of levels in the queue (${sets.max_levels_per_user})`, { replyTo: msg });
                break;
            }

            case ResCode.DISABLED: {
                client.say(channel, "Kappa Requests are disabled.", { replyTo: msg });
                break;
            }

            case ResCode.ERROR: {
                client.say(channel, "An error occurred. If the issue persists, please contact the developer.", { replyTo: msg });
                break;
            }

            case ResCode.OK: {
                client.say(channel, `PogChamp Added '${res.level.name}' (${res.level.id}) by ${res.level.creator} to the queue at position ${levels.levels.length}`, { replyTo: msg });
                client.logger.log(`Added level in channel: ${channel}`);
                break;
            }
        }

        return;
    }

    if (!text.startsWith(config.prefix)) return;

    let args = text.slice(config.prefix.length).trim().split(/ +/);
    let cmdName = args.shift().toLowerCase();
    let cmd = client.commands.get(cmdName)
        || client.commands.values().find(c => c.config.aliases?.includes(cmdName));

    if (!cmd || !cmd.config.enabled) return;

    let perms: Perm[] = client.db.load("perms", { channelId: msg.channelId }).perms;
    let customPerm = perms?.find(p => p.cmd == cmd.config.name);
    if ((customPerm?.perm || cmd.config.permLevel) > userPerms) return;

    try {
        client.logger.log(`Running command: ${cmd.config.name} in channel: ${channel}`);
        await cmd.run(client, msg, channel, args, userPerms);
    } catch (e) {
        client.say(channel, `An error occurred running command: ${cmd.config.name}. If the issue persists, please contact the developer.`, { replyTo: msg });
        console.error(e);
    }
});

export default Gdreqbot;
