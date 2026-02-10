import { ChatClient, ChatClientOptions } from "@twurple/chat";
import MapDB from "@galaxy05/map.db";

import BaseCommand from "../structs/BaseCommand";
import CommandLoader from "../modules/CommandLoader";
import Logger from "../modules/Logger";
import Database from "../modules/Database";
import Request from "../modules/Request";
import Server from "../modules/Server";
import config from "../config";
import { unlink } from "fs";
import fs from "fs";
import PermLevels from "../structs/PermLevels";
import { Blacklist } from "../datasets/blacklist";
import { Settings } from "../datasets/settings";
import { Perm } from "../datasets/perms";
import { User } from "../structs/user";
import { channelsdb } from "../core";
import { RefreshingAuthProvider } from "@twurple/auth";

class Gdreqbot extends ChatClient {
    commands: Map<string, BaseCommand>;
    cooldowns: Map<string, Map<string, number>>;
    cmdLoader: CommandLoader;
    logger: Logger;
    db: Database;
    req: Request;
    config: typeof config;
    blacklist: MapDB;

    constructor(db: Database, options?: ChatClientOptions) {
        const tokenData = JSON.parse(fs.readFileSync(`./tokens.${config.botId}.json`, "utf-8"));
        const authProvider = new RefreshingAuthProvider({
            clientId: config.clientId,
            clientSecret: config.clientSecret
        });
        
        authProvider.addUser(config.botId, tokenData);
        authProvider.addIntentsToUser(config.botId, ["chat"]);
        
        authProvider.onRefresh((userId, newTokenData) => {
            fs.writeFileSync(`./tokens.${userId}.json`, JSON.stringify(newTokenData, null, 4), "utf-8");
            new Logger("Client").log("Refreshing token...");
        });

        const channels: User[] = channelsdb.get("channels");

        super({
            ...options,
            authProvider,
            channels: channels.map(c => c.userName)
        });

        this.commands = new Map();
        this.cooldowns = new Map();
        this.cmdLoader = new CommandLoader();
        this.logger = new Logger("Client");
        this.db = db;
        this.req = new Request();
        this.config = config;
        this.blacklist = new MapDB("blacklist");

        const client = this;

        this.loadCommands();

        this.onConnect(async () => {
            //await this.db.init();

            //try {
            //    await new Server(client).run();
            //} catch (e) {
            //    console.error(e);
            //}

            try {
                const { channel, timestamp } = require("../../reboot.json");
                await this.say(channel, `Rebooted in ${((Date.now() - timestamp) / 1000).toFixed(1)} seconds.`);

                unlink("./reboot.json", () => {});
            } catch {}

            this.logger.ready("Ready");
            this.logger.ready(`Joining <channel>.`);
        });

        this.onJoinFailure(async (channel, reason) => {
            let channels: User[] = channelsdb.get("channels");
            let idx = channels.findIndex(c => c.userName == channel);
            if (idx == -1) return;

            let channelId = channels[idx].userId;

            await this.db.deleteAll({ channelId, channelName: channel });

            channels.splice(idx, 1);
            await channelsdb.set("channels", channels);
            this.logger.log(`←   Channel left: ${channel} (${reason})`);
        });

        this.onMessage(async (channel, user, text, msg) => {
            if (msg.userInfo.userId == this.config.botId && process.env.ENVIRONMENT != "dev") return;

            await this.db.setDefault({ channelId: msg.channelId, channelName: channel });

            let userPerms: PermLevels;
            let blacklist: Blacklist = this.db.load("blacklist", { channelId: msg.channelId });
            let sets: Settings = this.db.load("settings", { channelId: msg.channelId });
            let perms: Perm[] = this.db.load("perms", { channelId: msg.channelId }).perms;
            let globalUserBl: string[] = this.blacklist.get("users");

            if (globalUserBl?.includes(msg.userInfo.userId)) return;

            if (msg.userInfo.userId == config.ownerId) userPerms = PermLevels.DEV;
            else if (msg.userInfo.isBroadcaster) userPerms = PermLevels.STREAMER;
            else if (msg.userInfo.isMod) userPerms = PermLevels.MOD;
            else if (msg.userInfo.isVip) userPerms = PermLevels.VIP;
            else if (msg.userInfo.isSubscriber) userPerms = PermLevels.SUB;
            else if (!blacklist.users.find(u => u.userId == msg.userInfo.userId)) userPerms = PermLevels.USER;
            else userPerms = PermLevels.BLACKLISTED;

            if (text.trim() == "@gdreqbot" && sets?.prefix != this.config.prefix && !sets.silent_mode) return this.say(channel, `Prefix is: ${sets.prefix}`, { replyTo: msg });

            let isId = text.match(/\b\d{5,9}\b/);

            if (!text.startsWith(sets.prefix ?? config.prefix) && isId && userPerms != PermLevels.BLACKLISTED) {
                let reqPerm = perms?.find(p => p.cmd == this.commands.get("req").info.name);
                if ((reqPerm?.perm || this.commands.get("req").config.permLevel) > userPerms) return;

                try {
                    let notes = text.replace(isId[0], "").replaceAll(/\s+/g, " ");
                    await this.commands.get("req").run(client, msg, channel, [isId[0], notes.length > 1 ? notes : null], { auto: true, silent: sets.silent_mode });
                } catch (e) {
                    this.say(channel, "An error occurred running command: req. If the issue persists, please contact the developer.", { replyTo: msg });
                    console.error(e);
                }

                return;
            }

            if (!text.startsWith(sets.prefix ?? config.prefix)) return;

            let args = text.slice(sets.prefix?.length ?? config.prefix.length).trim().split(/ +/);
            let cmdName = args.shift().toLowerCase();
            let cmd = this.commands.get(cmdName)
                || this.commands.values().find(c => c.config.aliases?.includes(cmdName));

            if (!cmd || !cmd.config.enabled) return;

            if (!cmd.config.supportsSilent && sets.silent_mode && userPerms < PermLevels.DEV) return;

            let customPerm = perms?.find(p => p.cmd == cmd.info.name);
            if ((customPerm?.perm || cmd.config.permLevel) > userPerms) return;

            try {
                this.logger.log(`${sets.silent_mode ? "(silent) " : ""}Running command: ${cmd.info.name} in channel: ${channel}`);
                await cmd.run(client, msg, channel, args, { userPerms, silent: sets.silent_mode });
            } catch (e) {
                this.say(channel, `An error occurred running command: ${cmd.info.name}. If the issue persists, please contact the developer.`, { replyTo: msg });
                console.error(e);
            }
        });
    }

    private loadCommands() {
        const cmdFiles = fs.readdirSync("./dist/commands/").filter(f => f.endsWith(".js"));

        for (const file of cmdFiles) {
            const res = this.cmdLoader.load(this, file);
            if (res) this.logger.error(res);

            delete require.cache[require.resolve(`../commands/${file}`)];
        }
    }
}

export default Gdreqbot;
