import { Server, WebSocket } from "ws";
import Database from "./Database";
import Gdreqbot from "./Bot";
import Logger from "./Logger";

const port = parseInt(process.env.WS_PORT) || 8080;
const hostname = process.env.HOSTNAME || 'localhost';

export default class {
    wss: Server;
    db: Database;
    client: Gdreqbot;
    logger: Logger

    constructor(db: Database) {
        this.wss = new WebSocket.Server({ port });
        this.db = db;
        this.logger = new Logger("Socket");

        this.wss.on('listening', () => this.logger.ready(`Socket listening on ws://${hostname}:${port}`));

        this.wss.on('connection', ws => {
            this.logger.log("Client connected.");

            ws.on('close', () => {
                this.logger.log("Client disconnected.");
            });
        });
    }

    close() {
        this.logger.log("Closing Socket...");
        this.wss.close();
    }
}
