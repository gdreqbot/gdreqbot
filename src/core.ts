import dotenv from "dotenv";
dotenv.config({ quiet: true });

import Gdreqbot from "./modules/Bot";
import Server from "./modules/Server";
import Database from "./modules/Database";

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
