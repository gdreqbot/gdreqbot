import dotenv from "dotenv";
dotenv.config({ quiet: true });

import express, { NextFunction, Request, Response, Express } from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as twitchStrategy } from "passport-twitch-latest";
import bodyParser from "body-parser";
import { v4 as uuid } from "uuid";
import path from 'path';
import multer from "multer";
import moment from "moment";
import "moment-duration-format";
import fs from "fs";
import Gdreqbot from "../modules/Bot";
import { channelsdb } from "../core";
import { User } from "../structs/user";
import { Settings } from "../datasets/settings";
import { Perm } from "../datasets/perms";
import PermLevels from "../structs/PermLevels";
import BaseCommand from "../structs/BaseCommand";
import { Blacklist } from "../datasets/blacklist";
import { getUser } from "../apis/twitch";
import { LevelData } from "../datasets/levels";
import { getLevel } from "../apis/gd";
import { Server } from "http";
import { Session } from "../datasets/session";
import Database from "./Database";
import Logger from "./Logger";

const port = process.env.SERVER_PORT || 80;
const hostname = process.env.HOSTNAME || 'localhost';

export default class {
    app: Express;
    private client: Gdreqbot;
    server: Server;
    logger: Logger;
    db: Database;

    constructor(db: Database, client: Gdreqbot) {
        this.app = express();
        this.client = client;
        this.db = db;
        this.logger = new Logger("Server");

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
                let channelName = profile.login;
                let channelId = profile.id;

                let bl: string[] = this.client.blacklist.get("users");
                if (bl?.includes(channelId)) {
                    this.logger.warn(`Blacklisted user tried to auth: ${channelName} (${channelId})`);
                    return done(null, false);
                }

                let channels: User[] = channelsdb.get("channels");
                let channel: User = channels.find(c => c.userId == channelId);

                await this.client.join(channelName);

                if (!channel) {
                    // push to channels db
                    channels.push({ userId: channelId, userName: channelName });
                    
                    await channelsdb.set("channels", channels);
                    //await this.db.setDefault({ channelId, channelName });
                    await this.db.setDefault({ userId: channelId, userName: channelName }, "session");

                    await this.client.say(channelName, "Thanks for adding gdreqbot! You can get a list of commands by typing !help");
                    this.logger.log(`→   New channel joined: ${channelName}`);
                } else if (channel.userName != channelName) {
                    let idx = channels.findIndex(c => c.userId == channelId);
                    channels[idx].userName = channelName;

                    await channelsdb.set("channels", channels);
                } else {
                    this.logger.log(`Authenticated: ${channelName}`);
                }

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
            let channels: User[] = channelsdb.get("channels");
            let user = channels.find(c => c.userId == userId);
            if (!user)
                return done(null, false);

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

            console.log('/auth')
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
            let expires = Date.now() + 6.048E+8;

            if (!session.secret) {
                secret = uuid();
                await this.db.save("session", { userId }, {
                    secret,
                    issued: Date.now(),
                    expires
                });
            } else {
                secret = session.secret;
                await this.db.save("session", { userId }, { expires });
            }

            const redirect_uri = req.query.state;

            if (!redirect_uri)
                return res.status(500).send('Missing redirect');

            console.log('/auth/callback')
            console.log(redirect_uri)

            res.redirect(`${redirect_uri}?secret=${secret}`);
            //let redirectTo = req.query.state;

            //if (redirectTo == 'add')
            //    res.redirect('/auth/success');
            //else if (redirectTo == 'dashboard')
            //    res.redirect('/dashboard');
            //else
            //    res.redirect('/');
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
            let joined = channelsdb.get("channels").length;
            let uptime = moment.duration(process.uptime() * 1000).format(" D [days], H [hrs], m [mins], s [secs]");
            let twVersion = (require('../../package.json').dependencies["@twurple/chat"]).substr(1);
            let exprVersion = (require('../../package.json').dependencies["express"]).substr(1);
            let nodeVersion = process.version;
            let pkgVersion = require('../../package.json').version;

            let totalReq = 0;
            channelsdb.get("channels").forEach((channel: User) => {
                let data: LevelData[] = this.db.load("levels", { channelId: channel.userId })?.levels;
                if (data) data.forEach(() => totalReq++);
            });

            res.render('stats', {
                memUsage,
                dbUsage,
                joined,
                uptime,
                twVersion,
                exprVersion,
                nodeVersion,
                pkgVersion,
                totalReq
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

        server.get('/api/me', this.authSession, (req, res) => {
            const userId = (req.user as User).userId;
            const userName = (req.user as User).userName;

            res.json({
                userId,
                userName
            });
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

    private authSession = (req: Request, res: Response, next: NextFunction) => {
        const secret = req.headers.authorization?.replace('Bearer ', '');
        if (!secret)
            return res.status(401).send('Missing secret');

        let session: Session = this.db.load("session", { secret });
        if (!session)
            return res.status(401).send('Unauthorized secret');

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
