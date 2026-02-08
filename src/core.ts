import { RefreshingAuthProvider } from "@twurple/auth";
import fs, { unlink } from "fs";
import MapDB from "@galaxy05/map.db";
import dotenv from "dotenv";
dotenv.config({ quiet: true });

import Gdreqbot from "./modules/Bot";
import Server from "./modules/Server";
import Logger from "./modules/Logger";
import config from "./config";
import { User } from "./structs/user";

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

// ugliest workaround ever
let channels: User[] = [];
export const channelsdb = new MapDB("channels.db");

let updateUsers: User[] = [];
export const updatedb = new MapDB("update.db");

if (channelsdb.get("channels")) {
    channels = channelsdb.get("channels");
} else {
    channelsdb.set("channels", []).then(() => console.log("channels db setup"));
}

if (updatedb.get("updateUsers")) {
    updateUsers = updatedb.get("updateUsers");
} else {
    updatedb.set("updateUsers", []).then(() => console.log("update db setup"));
}

const client = new Gdreqbot({
    authProvider,
    channels: channels.map(c => c.userName)
});

client.connect();
client.db.init();

try {
    new Server(client).run();
} catch (e) {
    console.error(e);
}
