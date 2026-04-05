import dotenv from "dotenv";
dotenv.config({ quiet: true });

import Gdreqbot from "./modules/Bot";
import Server from "./modules/Server";
import Database from "./modules/Database";
import { Session } from "./datasets/session";
import Logger from "./modules/Logger";
import { User } from "./structs/user";

export const sessions: User[] = [];

const database = new Database("data.db");
database.init();

const client = new Gdreqbot(database);
client.connect();

const server = new Server(database, client);

try {
    server.run();
} catch (e) {
    console.error(e);
    new Logger("CORE").error("Server FATAL");
}

setInterval(async () => {
    const logger = new Logger("Cleanup");

    try {
        let savedSessions: Session[] = database.load("session", {}, true);
        let expired = savedSessions?.filter(s => Date.now() > s.expires);

        if (!expired?.length) return;

        for (let i = 0; i < expired.length; i++) {
            if (sessions.find(u => u.userId == expired[i].userId)) {
                //logger.log(`Skipping active session: ${expired[i].userName}`);
                continue;
            }

            logger.log(`Deleting expired session: ${expired[i].userName}`);
            sessions.splice(sessions.findIndex(u => u.userId == expired[i].userId), 1);
            await database.delete("session", { secret: expired[i].secret });
        }
    } catch (err) {
        logger.error(`Cleanup failed:`, err);
    }
}, 15*60*1000); // 15 min

