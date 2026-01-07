import dotenv from "dotenv";
dotenv.config({ quiet: true });

import express, { NextFunction, Request, Response } from "express";
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
import Gdreqbot, { channelsdb } from './core';
import { User } from "./structs/user";
import { Settings } from "./datasets/settings";
import { Perm } from "./datasets/perms";
import PermLevels from "./structs/PermLevels";
import BaseCommand from "./structs/BaseCommand";
import { Blacklist } from "./datasets/blacklist";
import { getUser } from "./apis/twitch";
import { LevelData } from "./datasets/levels";
import { getLevel } from "./apis/gd";

const server = express();
const port = process.env.PORT || 80;
const hostname = process.env.HOSTNAME || 'localhost';

export = class {
    async run(client: Gdreqbot) {
        server.use('/public', express.static(path.resolve(__dirname, '../dashboard/public')));
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
        server.set('views', path.join(__dirname, '../dashboard/views'));

        server.set('view engine', 'ejs');

        passport.use(
            new twitchStrategy({
                clientID: client.config.clientId,
                clientSecret: client.config.clientSecret,
                callbackURL: process.env.REDIRECT_URI,
                scope: 'chat:read chat:edit'
            }, async (accessToken, refreshToken, profile, done) => {
                let channelName = profile.login;
                let channelId = profile.id;

                let bl: string[] = client.blacklist.get("users");
                if (bl?.includes(channelId)) {
                    client.logger.warn(`Blacklisted user tried to auth: ${channelName} (${channelId})`);
                    return done(null, false);
                }

                let channels: User[] = channelsdb.get("channels");
                let channel: User = channels.find(c => c.userId == channelId);

                if (!channel) {
                    await client.join(channelName);

                    // push to channels db
                    channels.push({ userId: channelId, userName: channelName });
                    await channelsdb.set("channels", channels);
                    await client.db.setDefault({ channelId, channelName });

                    await client.say(channelName, "Thanks for adding gdreqbot! You can get a list of commands by typing !help");
                    client.logger.log(`→   New channel joined: ${channelName}`);
                } else if (channel.userName != channelName) {
                    let idx = channels.findIndex(c => c.userId == channelId);
                    channels[idx].userName = channelName;

                    await channelsdb.set("channels", channels);
                    await client.join(channelName);
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
                bot: client,
                path: req.path,
            };
            res.render(path.resolve(`./dashboard/views/${view}`), Object.assign(baseData, data));
        };

        server.get('/', (req, res) => {
            renderView(req, res, 'index');
        });

        server.get('/auth', (req, res, next) => {
            let redirectTo = req.query.redirectTo || 'dashboard';

            passport.authenticate('twitch', {
                state: redirectTo as string
            })(req, res, next);
        });

        server.get('/auth/callback', passport.authenticate('twitch', {
            failureRedirect: '/auth/error'
        }), (req, res) => {
            let redirectTo = req.query.state;

            if (redirectTo == 'add')
                res.redirect('/auth/success');
            else if (redirectTo == 'dashboard')
                res.redirect('/dashboard');
            else
                res.redirect('/');
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
            let twVersion = (require('../package.json').dependencies["@twurple/chat"]).substr(1);
            let exprVersion = (require('../package.json').dependencies["express"]).substr(1);
            let nodeVersion = process.version;
            let pkgVersion = require('../package.json').version;

            let totalReq = 0;
            channelsdb.get("channels").forEach((channel: User) => {
                let data: LevelData[] = client.db.load("levels", { channelId: channel.userId }).levels;
                data.forEach(() => totalReq++);
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
                cmds: client.commands.values()
                    .filter(cmd => cmd.config.permLevel < PermLevels.DEV)
                    .map(cmd => {
                        return {
                            name: cmd.config.name,
                            desc: cmd.config.description,
                            args: cmd.config.args,
                            aliases: cmd.config.aliases,
                            permLevel: this.normalize(PermLevels[cmd.config.permLevel]),
                            supportsPrivilege: cmd.config.supportsPrivilege,
                            privilegeDesc: cmd.config.privilegeDesc,
                            privilegeArgs: cmd.config.privilegeArgs
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
            if (req.isAuthenticated())
                return res.redirect(`/dashboard/${(req.user as User).userId}`);

            res.redirect('/auth');
        });

        server.get('/dashboard/:user', this.checkAuth, async (req, res) => {
            let userId = (req.user as User).userId;
            let userName = (req.user as User).userName;

            await client.db.setDefault({ channelId: userId, channelName: userName });

            if (userId != req.params.user)
                return res.status(403).send('Unauthorized');

            let sets: Settings = client.db.load("settings", { channelId: userId });
            let perms: Perm[] = client.db.load("perms", { channelId: userId }).perms;
            let bl: Blacklist = client.db.load("blacklist", { channelId: userId });

            let cmdData: any = [];
            let setData: any = this.getSettings(sets);

            client.commands.forEach(cmd => {
                if (cmd.config.permLevel == PermLevels.DEV) return;

                let permData = perms.find(p => p.cmd == cmd.config.name);

                let toPush = {
                    name: cmd.config.name,
                    desc: cmd.config.description,
                    perm: this.normalize(PermLevels[permData?.perm ?? cmd.config.permLevel]),
                    defaultPerm: this.normalize(PermLevels[cmd.config.permLevel]),
                    isDefault: !Boolean(permData)
                };

                cmdData.push(toPush);
            });

            let permLiterals = Object.keys(PermLevels).filter(k => isNaN(Number(k)));
            permLiterals.pop();

            res.render('dashboard', {
                isAuthenticated: true,
                user: req.user,
                setData,
                cmdData,
                perms: permLiterals.map(p => this.normalize(p)),
                bl
            });
        });

        server.post('/dashboard/:user', this.checkAuth, multer().none(), async (req, res) => {
            let userId = (req.user as User).userId;
            let userName = (req.user as User).userName;

            if (userId != req.params.user)
                return res.status(403).send('Unauthorized');

            switch (req.body.formType) {
                case "settings": {
                    let sets = this.parseSettings(req.body);
                    await client.db.save("settings", { channelId: userId }, sets);
                    client.logger.log(`Dashboard: updated settings for channel: ${userName}`);
                    break;
                }

                case "perms": {
                    let perms: Perm[] = client.db.load("perms", { channelId: userId }).perms;
                    let filtered = this.filterPerms(req.body, perms, client.commands);

                    filtered.forEach(perm => {
                        let name = perm.cmd.split('.')[0];
                        let toDelete = Boolean(perm.cmd.split('.')[1]);

                        let savedPerm = perms.find(p => p.cmd == name);

                        if (savedPerm) {
                            if (toDelete)
                                perms.splice(perms.findIndex(p => p.cmd == name), 1);
                            else
                                savedPerm.perm = perm.perm;
                        } else
                            if (!toDelete) perms.push(perm);
                    });

                    await client.db.save("perms", { channelId: userId }, { perms });
                    client.logger.log(`Dashboard: updated perms for channel: ${userName}`);
                    break;
                }

                case "blacklist-users": {
                    let userBl: User[] = client.db.load("blacklist", { channelId: userId }).users;
                    let invalid: string[] = [];

                    switch (req.body.action) {
                        case "add": {
                            let users = req.body.users.split(",").map((u: string) => u.trim()).filter(Boolean);
                            let hasInvalid = false;

                            for (let i = 0; i < users.length; i++) {
                                let raw = await getUser(users[i], "login");
                                if (!raw?.data.length) {
                                    invalid.push(users[i]);
                                    hasInvalid = true;
                                    continue;
                                }

                                if (hasInvalid)
                                    continue;

                                let data = {
                                    userId: raw.data[0].id,
                                    userName: raw.data[0].login
                                };

                                if (!userBl.find(u => u.userId == data.userId))
                                    userBl.push(data);
                            }

                            break;
                        }

                        case "remove": {
                            let idx = userBl.findIndex(u => u.userId == req.body.id);
                            if (idx == -1) return res.status(200).json({ success: true });

                            userBl.splice(idx, 1);
                            break;
                        }

                        case "clear": {
                            userBl = [];
                            break;
                        }
                    }

                    await client.db.save("blacklist", { channelId: userId }, { users: userBl });

                    if (invalid.length > 0) {
                        res.status(400).json({
                            success: false,
                            invalid,
                        });
                    } else {
                        client.logger.log(`Dashboard: updated user blacklist for channel: ${userName}`);
                        res.status(200).json({ success: true });
                    }
                    break;
                }

                case "blacklist-levels": {
                    let levelBl: LevelData[] = client.db.load("blacklist", { channelId: userId }).levels;
                    let invalid: string[] = [];

                    switch (req.body.action) {
                        case "add": {
                            let levels = req.body.levels.split(",").map((u: string) => u.trim()).filter(Boolean);
                            let hasInvalid = false;

                            for (let i = 0; i < levels.length; i++) {
                                let raw = await getLevel(levels[i]);
                                if (raw == "-1") {
                                    invalid.push(levels[i]);
                                    hasInvalid = true;
                                    continue;
                                }

                                if (hasInvalid)
                                    continue;

                                let data = client.req.parseLevel(raw);

                                if (!levelBl.find(l => l.id == data.id))
                                    levelBl.push(data);
                            }

                            break;
                        }

                        case "remove": {
                            let idx = levelBl.findIndex(l => l.id == req.body.id);
                            if (idx == -1) return res.status(200).json({ success: true });

                            levelBl.splice(idx, 1);
                            break;
                        }

                        case "clear": {
                            levelBl = [];
                            break;
                        }
                    }

                    await client.db.save("blacklist", { channelId: userId }, { levels: levelBl });

                    if (invalid.length > 0) {
                        res.status(400).json({
                            success: false,
                            invalid,
                        });
                    } else {
                        client.logger.log(`Dashboard: updated level blacklist for channel: ${userName}`);
                        res.status(200).json({ success: true });
                    }
                    break;
                }

                default: {
                    client.logger.error("what???");
                    break;
                }
            }

            res.status(200);
        });

        server.get('/logout', (req, res, next) => {
            if (req.isAuthenticated())
                req.logout(err => {
                    if (err) return next(err);
                });

            res.redirect('/');
        });

        server.get('/dashboard/:user/part', this.checkAuth, async (req, res, next) => {
            let userId = (req.user as User).userId;
            let userName = (req.user as User).userName;

            if (userId != req.params.user)
                return res.status(403).send('Unauthorized');

            let channels: User[] = channelsdb.get("channels");
            let user = channels.find(c => c.userId == userId);

            if (user) {
                try {
                    await client.commands.get('part').run(client, { channelId: userId } as any, userName);  // yes, I feel shame in doing this
                    res.redirect('/');
                } catch (err) {
                    client.logger.error('', err);
                    renderView(req, res, 'error');
                }
            }
        });

        client.server = server.listen(parseInt(port.toString()), hostname, () => client.logger.log(`Server listening on http(s)://${hostname}:${port}`));
    }

    checkAuth(req: Request, res: Response, next: NextFunction) {
        if (req.isAuthenticated())
            return next();

        res.redirect('/');
    }

    getSettings(sets: any) {
        const { defaultValues } = require('./datasets/settings');
        let obj: any = {};

        for (let [key, value] of Object.entries(defaultValues).slice(3)) {
            if (!sets[key])
                obj[key] = {
                    value,
                    defaultValue: value,
                    isDefault: true
                };
            else
                obj[key] = {
                    value: sets[key],
                    defaultValue: value,
                    isDefault: sets[key] == defaultValues[key]
                };
        }

        return obj;
    }

    parseSettings(data: any) {
        let parsed: any = {};

        for (let [key, value] of Object.entries(data)) {
            if (key == "formType") continue;
            if (!value) {
                parsed[key] = -1;
                continue;
            }

            let n = parseInt(value as any);
            if (!isNaN(n))
                value = n;

            parsed[key] = value;
        }

        return parsed;
    }

    filterPerms(data: any, perms: Perm[], cmds: Map<string, BaseCommand>) {
        let filtered: Perm[] = [];

        for (let [key, value] of Object.entries(data)) {
            if (!value) continue;

            let cmd = cmds.get(key);
            if (!cmd) continue;

            let permData = perms.find(p => p.cmd == cmd.config.name);
            let permValue: any = PermLevels[(value as any).toUpperCase()];

            if (permValue != (permData?.perm ?? cmd.config.permLevel)) {
                filtered.push({
                    cmd: permValue == cmd.config.permLevel ? `${cmd.config.name}.d` : cmd.config.name,
                    perm: permValue
                });
            }
        }

        return filtered;
    }

    normalize(str: string) {
        let normalized = str.toLowerCase();
        return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    }
}
