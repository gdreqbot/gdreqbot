import { Server as WsServer, WebSocket } from "ws";
import Database from "./Database";
import Gdreqbot from "./Bot";
import Logger from "./Logger";
import yml from "yaml";
import fs from "fs";
import { Session } from "../datasets/session";
import { sessions } from "../core";
import config from "../config";
import Server from "./Server";

const responses = yml.parse(fs.readFileSync('./responses.yml', 'utf8'));

const port = parseInt(process.env.WS_PORT) || 8080;
const hostname = process.env.HOSTNAME || 'localhost';

export default class {
    wss: WsServer;
    db: Database;
    client: Gdreqbot;
    server: Server;
    logger: Logger;

    constructor(db: Database, server: Server) {
        this.wss = new WebSocket.Server({ port });
        this.db = db;
        this.logger = new Logger("Socket");
        this.client = server.client;
        this.server = server;

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
                const msg: CmdMsg | AuthMsg = JSON.parse(raw.toString());

                if (!ws.authenticated) return await this.authenticate(ws, msg as AuthMsg);

                if (this.server.isBlacklisted(ws.userId))
                    return this.sendFailure(ws, FailureCode.BLACKLISTED);

                switch (msg.type) {
                    case "cmd": {
                        let cmd: CmdMsg = msg as CmdMsg;
                        let res = this.parseResponse(cmd.res);
                        if (res) {
                            let replyTo = cmd.msgId ?? null;
                            this.client.say(ws.userName, res, { replyTo });
                            this.logger.log(`${!replyTo ? "(auto) " : ""}Ran command: ${cmd.res.path.split('.')[0]} in channel: ${ws.userName}`);
                        }
                        break;
                    }

                    default: {
                        this.logger.warn("huh?");
                        break;
                    }
                }
            });

            ws.on('close', async () => {
                this.logger.log(`Client disconnected: ${ws.userName}`);

                if (this.client.currentChannels.includes(`#${ws.userName}`))
                    this.client.part(ws.userName);

                //this.logger.debug(`-- sessions before close (${ws.userName}) --`);
                //console.log(sessions);
                sessions.splice(sessions.findIndex(u => u.userId == ws.userId), 1);
                //this.logger.debug(`-- sessions after close (${ws.userName}) --`);
                //console.log(sessions);
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

    sendFailure(ws: Socket, code: FailureCode, platform?: string) {
        this.logger.warn(`Failure: code ${code}`);
        let str = `failure:${code}`;

        if (code == FailureCode.OUTDATED)
            str += `:${config.clientVersion[platform as "win32" | "darwin" | "linux"]}`;

        ws.send(str);
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

    private async authenticate(ws: Socket, msg: AuthMsg) {
        if (!ws.authenticated) {
            if (msg.type != "auth") {
                this.logger.warn("Disconnecting unauthorized client...");
                this.sendFailure(ws, FailureCode.UNAUTHORIZED);
                return false;
            }

            let [ platform, version ] = msg.version.split(":");

            if (version != config.clientVersion[platform as "win32" | "darwin" | "linux"]) {
                this.sendFailure(ws, FailureCode.OUTDATED, platform);
                return false;
            }

            const session: Session = this.db.load("session", { secret: msg.secret });
            if (!session) {  // invalid secret check
                this.logger.warn("Disconnecting client for invalid secret...");
                this.sendFailure(ws, FailureCode.UNAUTHORIZED);
                return false;
            } else if (sessions.find(u => u.userId == session.userId)) {  // duplicate session check
                this.sendFailure(ws, FailureCode.DUPLICATE);
                return false;
            } else if (this.server.isBlacklisted(session.userId)) {  // blacklist check
                this.sendFailure(ws, FailureCode.BLACKLISTED);
                return false;
            }

            ws.authenticated = true;
            ws.userId = session.userId;
            ws.userName = session.userName;
            ws.send(JSON.stringify({ type: "auth_ok" }));
            this.logger.log(`Client authenticated: ${session.userName}`);

            try {
                await this.client.join(ws.userName);
                this.client.say(session.userName, "Thanks for using gdreqbot!");

                //this.logger.debug(`-- sessions before auth (${ws.userName})`);
                //console.log(sessions);
                sessions.push({ userId: session.userId, userName: session.userName });
                //this.logger.debug(`-- sessions after auth (${ws.userName})`);
                //console.log(sessions);
            } catch {
                this.sendFailure(ws, FailureCode.JOIN);
                return false;
            }
            return true;
        }
    }
}

interface Socket extends WebSocket {
    authenticated: boolean;
    userId: string;
    userName: string;
    duplicate: boolean;
    outdated: boolean;
}

interface CmdMsg {
    type: string;
    res: Response;
    msgId?: string;
}

interface AuthMsg {
    type: string;
    secret: string;
    version: string;
}

interface Response {
    path: string;
    data?: any;
}

enum FailureCode {
    JOIN,
    DUPLICATE,
    OUTDATED,
    NO_SECRET,
    UNAUTHORIZED,
    BLACKLISTED
}
