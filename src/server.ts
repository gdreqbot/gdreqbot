import dotenv from "dotenv";
dotenv.config({ quiet: true });

import express, { NextFunction, Request, Response } from "express";
import session from "express-session";
import passport, { serializeUser } from "passport";
import { Strategy as twitchStrategy } from "passport-twitch-latest";
import bodyParser from "body-parser";
import { v4 as uuid } from "uuid";
import path from 'path';
import querystring from "querystring";
import superagent from "superagent";
import Gdreqbot, { channelsdb } from './core';
import { getUserByToken } from "./apis/twitch";
import { User } from "./structs/user";
import { Settings } from "./datasets/settings";

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

                let channels: User[] = channelsdb.get("channels");
                let channel: User = channels.find(c => c.userId == channelId);

                if (!channel) {
                    // push to channels db
                    channels.push({ userId: channelId, userName: channelName });
                    await channelsdb.set("channels", channels);

                    await client.join(channelName);
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
            console.log(req.isAuthenticated());
            console.log(req.user);
            renderView(req, res, 'index');
        });

        server.get('/auth', passport.authenticate('twitch'));
        server.get('/auth/callback', passport.authenticate('twitch', {
            successRedirect: '/dashboard',
            failureRedirect: '/auth/error'
        }));

        server.get('/auth/success', (req, res) => {
            renderView(req, res, 'authsuccess');
        });

        server.get('/auth/error', (req, res) => {
            renderView(req, res, 'autherror');
        });

        //server.get('/auth', (req, res) => {
        //    let url = 'https://id.twitch.tv/oauth2/authorize?' + querystring.stringify({
        //        client_id: client.config.clientId,
        //        redirect_uri: process.env.REDIRECT_URI,
        //        response_type: 'code',
        //        scope: 'chat:read chat:edit'
        //    });

        //    res.redirect(url);
        //});

        //server.get('/auth/callback', async (req, res) => {
        //    let data = querystring.stringify({
        //        client_id: client.config.clientId,
        //        client_secret: client.config.clientSecret,
        //        code: req.query.code as string,
        //        grant_type: 'authorization_code',
        //        redirect_uri: process.env.REDIRECT_URI,
        //    });

        //    try {
        //        let auth = await superagent
        //            .post('https://id.twitch.tv/oauth2/token')
        //            .set('Content-Type', 'application/x-www-form-urlencoded')
        //            .send(data);

        //        let { access_token } = auth.body;
        //        let user = await getUserByToken(access_token);

        //        let channelName = user.data[0].login;
        //        let channelId = user.data[0].id;

        //        let channels: User[] = channelsdb.get("channels");
        //        let channel: User = channels.find(c => c.userId == channelId);

        //        if (!channel) {
        //            // push to channels db
        //            channels.push({ userId: channelId, userName: channelName });
        //            await channelsdb.set("channels", channels);

        //            await client.join(channelName);
        //            await client.db.setDefault({ channelId, channelName });

        //            await client.say(channelName, "Thanks for adding gdreqbot! You can get a list of commands by typing !help");
        //            client.logger.log(`→   New channel joined: ${channelName}`);
        //        } else if (channel.userName != channelName) {
        //            let idx = channels.findIndex(c => c.userId == channelId);
        //            channels[idx].userName = channelName;

        //            await channelsdb.set("channels", channels);
        //            await client.join(channelName);
        //        }

        //        renderView(req, res, 'authsuccess');
        //    } catch (err) {
        //        client.logger.error('Error exchanging code for access token:', err);
        //        renderView(req, res, 'autherror');
        //    }
        //});

        server.get('/stats', (req, res) => {
            renderView(req, res, 'stats');
        });

        server.get('/commands', (req, res) => {
            renderView(req, res, 'commands');
        });

        server.get('/terms-of-service', (req, res) => {
            renderView(req, res, 'terms-of-service');
        });

        server.get('/privacy-policy', (req, res) => {
            renderView(req, res, 'privacy-policy');
        });

        server.get('/dashboard', (req, res) => {
            if (req.isAuthenticated())
                return res.redirect(`/dashboard/${(req.user as User).userId}`);

            res.redirect('/auth');
        });

        server.get('/dashboard/:user', this.checkAuth, (req, res) => {
            if ((req.user as User).userId != req.params.user)
                return res.status(403).send('Unauthorized');

            let sets: Settings = client.db.load("settings", { channelId: (req.user as User).userId });

            res.render('dashboard', {
                isAuthenticated: true,
                user: req.user,
                sets
            });
        });

        server.get('/logout', (req, res, next) => {
            if (req.isAuthenticated())
                req.logout(err => {
                    if (err) return next(err);
                });

            res.redirect('/');
        });

        client.server = server.listen(parseInt(port.toString()), hostname, () => console.log(`Server listening on http(s)://${hostname}:${port}`));
    }

    checkAuth(req: Request, res: Response, next: NextFunction) {
        if (req.isAuthenticated())
            return next();
        
        res.redirect('/dashboard');
    }
}
