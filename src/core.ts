import { RefreshingAuthProvider } from "@twurple/auth";
import { ChatClient, ChatClientOptions } from "@twurple/chat";
import fs from "fs";
import MapDB from "@galaxy05/map.db";
import { config } from "dotenv";
config({ quiet: true });

import BaseCommand from "./structs/BaseCommand";
import CommandLoader from "./modules/CommandLoader";
import Logger from "./modules/Logger";
import Request, { ResCode } from "./modules/Request";

const usrId = "1391218436";
const prefix = process.env.PREFIX;
const clientId = process.env.CLIENT_ID as string;
const clientSecret = process.env.SECRET as string;

const tokenData = JSON.parse(fs.readFileSync(`./tokens.${usrId}.json`, "utf-8"));
const authProvider = new RefreshingAuthProvider({
    clientId,
    clientSecret
});

authProvider.addUser(usrId, tokenData);
authProvider.addIntentsToUser(usrId, ["chat"]);

authProvider.onRefresh((userId, newTokenData) => {
    fs.writeFileSync(`./tokens.${userId}.json`, JSON.stringify(newTokenData, null, 4), "utf-8");
    new Logger().log("Refreshing token...");
});

class Gdreqbot extends ChatClient {
    commands: Map<string, BaseCommand>;
    cmdLoader: CommandLoader;
    logger: Logger;
    db: MapDB;
    req: Request;

    constructor(options: ChatClientOptions) {
        super(options);

        this.commands = new Map();
        this.cmdLoader = new CommandLoader();
        this.logger = new Logger();
        this.db = new MapDB("data.db");
        this.req = new Request(this.db);
    }
}

const client = new Gdreqbot({
    authProvider,
    channels: ["galaxyvinci05"],
});

const cmdFiles = fs.readdirSync("./dist/commands/").filter(f => f.endsWith(".js"));

for (const file of cmdFiles) {
    const res = client.cmdLoader.load(client, file);
    if (res) client.logger.error(res);

    delete require.cache[require.resolve(`./commands/${file}`)];
}

client.connect();

client.onConnect(() => {
    client.logger.log("Ready");
});

client.onMessage(async (channel, user, text, msg) => {
    let isId = text.match(/\b\d{5,9}\b/);

    if (isId) {
        let res = await client.req.addLevel(client, isId[0], user);
            
        switch (res.status) {
            case ResCode.NOT_FOUND: {
                client.say(channel, "Kappa Couldn't find a level matching that ID.", { replyTo: msg });
                break;
            }

            case ResCode.ALREADY_ADDED: {
                client.say(channel, "Kappa That level is already in the queue.", { replyTo: msg });
                break;
            }

            case ResCode.MAX_PER_USER: {
                client.say(channel, "Kappa You have the max amount of levels in the queue (2)", { replyTo: msg });
                break;
            }

            case ResCode.DISABLED: {
                client.say(channel, "Kappa Requests are disabled.", { replyTo: msg });
                break;
            }

            case ResCode.ERROR: {
                client.say(channel, "An error occurred.", { replyTo: msg });
                break;
            }

            case ResCode.OK: {
                client.say(channel, `PogChamp Added '${res.level.name}' (${res.level.id}) by ${res.level.creator} to the queue at position ${client.db.get("levels").length}`, { replyTo: msg });
                break;
            }
        }
    }

    if (!text.startsWith(prefix) || isId) return;

    let args = text.slice(prefix.length).trim().split(/ +/);
    let cmdName = args.shift().toLowerCase();
    let cmd = client.commands.get(cmdName)
        || client.commands.values().find(c => c.config.aliases?.includes(cmdName));

    if (!cmd || !cmd.config.enabled || (cmd.config.devOnly && user != "galaxyvinci05")) return;

    try {
        await cmd.run(client, { channel, user, text, msg }, args);
    } catch (e) {
        client.say(channel, `An error occurred running command: ${cmd.config.name}`, { replyTo: msg });
        console.error(e);
    }
});

export default Gdreqbot;
