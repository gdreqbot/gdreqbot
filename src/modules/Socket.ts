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

        setInterval(() => {
            this.wss.clients.forEach(ws => {
                if (ws.readyState == WebSocket.OPEN)
                    ws.ping();
            });
        }, 30*1000);

        this.wss.on('listening', () => this.logger.ready(`Socket listening on ws://${hostname}:${port}`));

        this.wss.on('connection', (ws: Socket) => {
            ws.authenticated = false;
            this.logger.log("Client connected.");

            ws.on('message', async raw => {
                const msg: SocketMsg = JSON.parse(raw.toString());

                if (!ws.authenticated) return await this.authenticate(ws, msg);

                let res = this.parseResponse(msg.res);
                if (res) {
                    let replyTo = msg.msgId ?? null;
                    this.client.say(ws.userName, res, { replyTo });
                    this.logger.log(`${!replyTo ? "(auto) " : ""}Ran command: ${msg.res.path.split('.')[0]} in channel: ${ws.userName}`);
                }
            });

            ws.on('close', async () => {
                this.logger.log(`Client disconnected: ${ws.userName}`);
                this.client.part(ws.userName);
                await this.db.save("session", { userId: ws.userId }, { active: false });
            });

            ws.on('error', err => {
                console.error(err);
                this.logger.error(`Error occurred (${ws.userName})`);
            });
        });

        this.wss.on('error', err => {
            console.error(err);
            this.logger.error('Error occurred (server socket)');
        });
    }

    close() {
        this.logger.log("Closing Socket...");
        this.wss.close();
    }

    sendFailure(ws: Socket) {
        this.logger.warn("Failure");
        ws.send("failure");
        ws.close();
    }

    private parseResponse(res: Response) {
        if (!res.path) return null;

        let str: string = res.path.split('.').reduce((acc, key) => acc?.[key], responses);
        if (!res.data)
            return str;

        for (let key in res.data) {
            if (res.data[key].toString().startsWith('http://') || res.data[key].toString().startsWith('https://'))
                return null;

            str = str.replace(`<${key}>`, res.data[key]);
        }

        return str;
    }

    private async authenticate(ws: Socket, msg: any) {
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
            this.logger.log(`Client authenticated: ${session.userName}`);

            try {
                await this.client.join(ws.userName);
                await this.db.save("session", { secret: msg.secret }, { active: true });
                this.client.say(session.userName, "Thanks for using gdreqbot!");
            } catch {
                this.sendFailure(ws);
            }
            return true;
        }
    }
}

interface Socket extends WebSocket {
    authenticated: boolean;
    userId: string;
    userName: string;
}

interface SocketMsg {
    res: Response;
    msgId?: string;
}

interface Response {
    path: string;
    data?: any;
}
