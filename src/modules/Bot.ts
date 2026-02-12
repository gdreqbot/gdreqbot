import { ChatClient, ChatClientOptions } from "@twurple/chat";

import BaseCommand from "../structs/BaseCommand";
import CommandLoader from "../modules/CommandLoader";
import Logger from "../modules/Logger";
import Database from "../modules/Database";
import config from "../config";
import { unlink } from "fs";
import fs from "fs";
import PermLevels from "../structs/PermLevels";
import { RefreshingAuthProvider } from "@twurple/auth";
import GlobalBl from "./Blacklist";

class Gdreqbot extends ChatClient {
    commands: Map<string, BaseCommand>;
    cooldowns: Map<string, Map<string, number>>;
    cmdLoader: CommandLoader;
    logger: Logger;
    db: Database;
    req: Request;
    config: typeof config;
    blacklist: GlobalBl;

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

        super({
            ...options,
            authProvider,
            channels: [] //todo: check active sessions
        });

        this.commands = new Map();
        this.cooldowns = new Map();
        this.cmdLoader = new CommandLoader();
        this.logger = new Logger("Client");
        this.db = db;
        this.config = config;
        this.blacklist = new GlobalBl();

        const client = this;

        this.loadCommands();

        this.onConnect(async () => {
            await this.blacklist.init();

            try {
                const { channel, timestamp } = require("../../reboot.json");
                await this.say(channel, `Rebooted in ${((Date.now() - timestamp) / 1000).toFixed(1)} seconds.`);

                unlink("./reboot.json", () => {});
            } catch {}

            this.logger.ready("Ready");
        });

        this.onJoin(channel => {
            this.logger.log(`Joined channel: ${channel}`);
        });

        this.onJoinFailure(async (channel, reason) => {
            await this.db.deleteAll({ channelName: channel });

            this.logger.log(`Failed to join: ${channel} (${reason})`);
        });

        this.onMessage(async (channel, user, text, msg) => {
            if (msg.userInfo.userId == this.config.botId && process.env.ENVIRONMENT != "dev") return;

            let userPerms: PermLevels;

            if (msg.userInfo.userId == config.ownerId) userPerms = PermLevels.DEV;
            else userPerms = PermLevels.USER;

            if (!text.startsWith(config.prefix)) return;

            let args = text.slice(config.prefix.length).trim().split(/ +/);
            let cmdName = args.shift().toLowerCase();
            let cmd = this.commands.get(cmdName)
                || this.commands.values().find(c => c.config.aliases?.includes(cmdName));

            if (!cmd || !cmd.config.enabled) return;

            try {
                this.logger.log(`Running command: ${cmd.info.name} in channel: ${channel}`);
                await cmd.run(client, msg, channel, args, { userPerms });
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
