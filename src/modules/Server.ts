import dotenv from "dotenv";
dotenv.config({ quiet: true });

import express, { NextFunction, Request, Response, Express } from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as twitchStrategy } from "passport-twitch-latest";
import bodyParser from "body-parser";
import { v4 as uuid } from "uuid";
import path from 'path';
import moment from "moment";
import "moment-duration-format";
import fs from "fs";
import Gdreqbot from "../modules/Bot";
import { User } from "../structs/user";
import PermLevels from "../structs/PermLevels";
import { Server } from "http";
import { Session } from "../datasets/session";
import Database from "./Database";
import Logger from "./Logger";
import config from "../config";
import Socket from "./Socket";

const port = process.env.SERVER_PORT || 80;
const hostname = process.env.HOSTNAME || 'localhost';

export default class {
    app: Express;
    private client: Gdreqbot;
    server: Server;
    logger: Logger;
    db: Database;
    private socket: Socket;

    constructor(db: Database, client: Gdreqbot) {
        this.app = express();
        this.client = client;
        this.db = db;
        this.logger = new Logger("Server");
        this.socket = new Socket(db, client);

        const server = this.app;

        server.use('/public', express.static(path.resolve(__dirname, '../../web/public')));
        server.use(express.json());
        server.use(express.urlencoded({ extended: false }));
        server.use(
            session({
                genid: () => {
                    return uuid();
                },
                secret: process.env.SESSION_SECRET,
                resave: false,
                saveUninitialized: false
            }),
        );
        server.use(passport.initialize());
        server.use(passport.session());
        server.use(bodyParser.json());
        server.set('views', path.join(__dirname, '../../web/views'));

        server.set('view engine', 'ejs');

        passport.use(
            new twitchStrategy({
                clientID: this.client.config.clientId,
                clientSecret: this.client.config.clientSecret,
                callbackURL: process.env.REDIRECT_URI,
                scope: 'chat:read chat:edit'
            }, async (accessToken, refreshToken, profile, done) => {
                let user: User = {
                    userId: profile.id,
                    userName: profile.login
                };
                done(null, user);
            })
        );

        passport.serializeUser((user: User, done) => {
            done(null, user.userId);
        });

        passport.deserializeUser((userId, done) => {
            const session: Session = client.db.load("session", { userId });
            if (!session)
                return done(null, false);

            let user: User = {
                userId: session.userId,
                userName: session.userName
            }

            done(null, user);
        });

        const renderView = (req: Request, res: Response, view: string, data: any = {}) => {
            const baseData = {
                bot: this.client,
                path: req.path,
            };
            res.render(path.resolve(`./web/views/${view}`), Object.assign(baseData, data));
        };

        server.get('/', (req, res) => {
            renderView(req, res, 'index');
        });

        server.get('/auth', (req, res, next) => {
            const { redirect_uri } = req.query;

            if (!redirect_uri?.toString().startsWith('http://127.0.0.1:'))
                return res.status(400).send('Invalid redirect');

            passport.authenticate('twitch', {
                state: redirect_uri.toString()
            })(req, res, next);
        });

        server.get('/auth/callback', passport.authenticate('twitch', {
            failureRedirect: '/auth/error'
        }), async (req, res) => {
            let userId = (req.user as User).userId;
            let userName = (req.user as User).userName;

            // save user and session secret
            let session: Session = this.db.load("session", { userId });
            let secret: string;
            let expires = Date.now() + (1000*60*60*24); // 24h

            if (!session?.secret) {
                secret = uuid();
                await this.db.save("session", { userId }, {
                    userId,
                    userName,
                    secret,
                    issued: Date.now(),
                    expires
                });

                this.logger.log(`→   New channel: ${userName}`);
            } else {
                secret = session.secret;
                await this.db.save("session", { userId }, { expires });
            }

            const redirect_uri = req.query.state;

            if (!redirect_uri)
                return res.status(500).send('Missing redirect');

            res.redirect(`${redirect_uri}?secret=${secret}`);
        });

        server.get('/auth/success', (req, res) => {
            renderView(req, res, 'authsuccess');
        });

        server.get('/auth/error', (req, res) => {
            renderView(req, res, 'autherror');
        });

        server.get('/stats', (req, res) => {
            let memUsage = `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`;
            let dbUsage = `${((fs.statSync('./data/data.db').size) / 1024).toFixed(2)} KB`;
            let joined = client.db.size("session");
            let uptime = moment.duration(process.uptime() * 1000).format(" D [days], H [hrs], m [mins], s [secs]");
            let twVersion = (require('../../package.json').dependencies["@twurple/chat"]).substr(1);
            let exprVersion = (require('../../package.json').dependencies["express"]).substr(1);
            let nodeVersion = process.version;
            let pkgVersion = require('../../package.json').version;

            res.render('stats', {
                memUsage,
                dbUsage,
                joined,
                uptime,
                twVersion,
                exprVersion,
                nodeVersion,
                pkgVersion
            });
        });

        server.get('/commands', (req, res) => {
            res.render('commands', {
                cmds: this.client.commands.values()
                    .filter(cmd => cmd.config.permLevel < PermLevels.DEV)
                    .map(cmd => {
                        return {
                            name: cmd.info.name,
                            desc: cmd.info.description,
                            args: cmd.info.args,
                            aliases: cmd.config.aliases,
                            permLevel: this.normalize(PermLevels[cmd.config.permLevel]),
                            supportsPrivilege: cmd.config.supportsPrivilege,
                            supportsSilent: cmd.config.supportsSilent,
                            privilegeDesc: cmd.info.privilegeDesc,
                            privilegeArgs: cmd.info.privilegeArgs
                        };
                })
            });
        });

        server.get('/terms-of-service', (req, res) => {
            renderView(req, res, 'terms-of-service');
        });

        server.get('/privacy-policy', (req, res) => {
            renderView(req, res, 'privacy-policy');
        });

        server.get('/faq', (req, res) => {
            renderView(req, res, 'faq');
        });

        server.get('/updates', (req, res) => {
            renderView(req, res, 'updates');
        });

        server.get('/versions', (req, res) => {
            renderView(req, res, 'versions');
        });

        server.get('/dashboard', (req, res) => {
            res.redirect('/');
        });

        server.get('/download', (req, res) => {
            res.render('download');
        });

        server.get('/api/me', this.authSession, (req, res) => {
            const userId = (req.user as User).userId;
            const userName = (req.user as User).userName;

            const version = req.headers.version;
            if (version != config.clientVersion) {
                this.logger.warn(`Client is outdated: ${userName}`);
                return res.status(401).json({
                    text: "Outdated client",
                    upstream: config.clientVersion
                });
            }

            this.logger.log(`Authenticated: ${userName}`);
            res.json({
                userId,
                userName
            });
        });

        server.get('/api/global-bl', (req, res) => {
            if (!["users", "levels"].includes(req.headers.type?.toString()))
                return res.status(400).json({
                    text: 'Invalid type'
                });

            res.status(200).json({
                text: this.client.blacklist.has(req.headers.id?.toString(), req.headers.type.toString() as "users" | "levels")
            });
        });

        server.get('/health', (req, res) => {
            res.status(200).json({ status: "ok" });
        });
    }

    run(): Promise<ServerOutput> {
        return new Promise((resolve, reject) => {
            this.server = this.app.listen(parseInt(port.toString()), hostname, () => {
                this.logger.ready(`Server listening on http(s)://${hostname}:${port}`);
                resolve({
                    close: () => this.close()
                });
            });

            this.server.on('error', reject);
        });
    }

    close() {
        if (this.server) {
            this.server.close();
            this.server = null;
        }
    }

    private checkAuth(req: Request, res: Response, next: NextFunction) {
        if (req.isAuthenticated())
            return next();

        res.redirect('/');
    }

    private authSession = async (req: Request, res: Response, next: NextFunction) => {
        const secret = req.headers.authorization?.replace('Bearer ', '');

        if (!secret) {
            this.logger.warn('Client is missing secret');
            return res.status(401).json({ text: "Missing secret" });
        }

        let session: Session = this.db.load("session", { secret });
        if (!session) {
            this.logger.warn('Client has unauthorized secret');
            return res.status(401).json({ text: "Unauthorized secret" });
        }

        if (this.client.blacklist.has(session.userId, "users")) {
            this.logger.warn(`Blacklisted user tried to auth: ${session.userName} (${session.userId})`);
            await this.db.delete("session", { userId: session.userId });
            return res.status(401).json({ text: "Blacklisted" });
        }

        req.user = session;
        next();
    }

    private normalize(str: string) {
        let normalized = str.toLowerCase();
        return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    }
}

export interface ServerOutput {
    close: Function;
}
