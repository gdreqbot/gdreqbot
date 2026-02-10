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
import Database from "./modules/Database";
import Socket from "./modules/Socket";

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

const database = new Database("data.db");
database.init();

const client = new Gdreqbot(database);
client.connect();

const server = new Server(database, client);

try {
    server.run();
} catch (e) {
    console.error(e);
}

const socket = new Socket(database);
