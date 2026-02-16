import dotenv from "dotenv";
dotenv.config({ quiet: true });

import Gdreqbot from "./modules/Bot";
import Server from "./modules/Server";
import Database from "./modules/Database";
import { Session } from "./datasets/session";
import Logger from "./modules/Logger";

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
        let sessions: Session[] = database.load("session", {}, true);
        let expired = sessions?.filter(s => Date.now() > s.expires);

        if (!expired?.length) return;

        for (let i = 0; i < expired.length; i++) {
            if (expired[i].active) continue;

            logger.log(`Deleting expired session: ${expired[i].userName}`);
            await database.delete("session", { secret: expired[i].secret });
        }
    } catch (err) {
        logger.error(`Cleanup failed:`, err);
    }
}, 15*60*1000); // 15 min

