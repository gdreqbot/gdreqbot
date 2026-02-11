import { Server, WebSocket } from "ws";
import Database from "./Database";
import Gdreqbot from "./Bot";
import Logger from "./Logger";
import yml from "yaml";
import fs from "fs";

const responses = yml.parse(fs.readFileSync('./responses.yml', 'utf8'));

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
        console.log(responses)

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

    private parseResponse(res: Response) {
        let str: string = res.path.split('.').reduce((acc, key) => acc?.[key], responses);
        if (!res.data)
            return str;

        for (let key in res.data) {
            if (res.data[key].startsWith('http://') || res.data[key].startsWith('https://'))
                return null;

            str = str.replace(`<${key}>`, res.data[key]);
        }

        return str;
    }
}

interface Response {
    path: string;
    data?: any;
}
