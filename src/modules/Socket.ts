import { Server, WebSocket } from "ws";
import Database from "./Database";
import Gdreqbot from "./Bot";
import Logger from "./Logger";
import yml from "yaml";
import fs from "fs";
import { Session } from "../datasets/session";

const responses = yml.parse(fs.readFileSync('./responses.yml', 'utf8'));

const port = parseInt(process.env.WS_PORT) || 8080;
const hostname = process.env.HOSTNAME || 'localhost';

export default class {
    wss: Server;
    db: Database;
    client: Gdreqbot;
    logger: Logger

    constructor(db: Database, client: Gdreqbot) {
        this.wss = new WebSocket.Server({ port });
        this.db = db;
        this.logger = new Logger("Socket");
        this.client = client;

        this.wss.on('listening', () => this.logger.ready(`Socket listening on ws://${hostname}:${port}`));

        this.wss.on('connection', (ws: Socket) => {
            ws.authenticated = false;
            this.logger.log("Client connected.");

            ws.on('message', raw => {
                const msg: Response = JSON.parse(raw.toString());

                if (!ws.authenticated) return this.authenticate(ws, msg);

                let res = this.parseResponse(msg);
                if (res) {
                    this.client.say(ws.userName, res);
                }
            });

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

    private authenticate(ws: Socket, msg: any) {
        if (!ws.authenticated) {
            if (msg.type != "auth") {
                this.logger.warn("Disconnecting unauthorized client...");
                ws.close(1008, "Auth required");
                return false;
            }

            const session: Session = this.db.load("session", { secret: msg.secret });
            if (!session) {
                this.logger.warn("Disconnecting client for invalid secret...");
                ws.close(1008, "Invalid secret");
                return false;
            }

            ws.authenticated = true;
            ws.userId = session.userId;
            ws.userName = session.userName;
            ws.send(JSON.stringify({ type: "auth_ok" }));
            return true;
        }
    }
}

interface Socket extends WebSocket {
    authenticated: boolean;
    userId: string;
    userName: string;
}

interface Response {
    path: string;
    data?: any;
}
