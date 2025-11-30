require('dotenv').config();

import express, { Request, Response } from "express";
import path from 'path';
import querystring from "querystring";
import superagent from "superagent";
import Gdreqbot from './core';

const server = express();
const port = process.env.PORT || 80;

export = class {
    async run(client: Gdreqbot) {
        server.use('/public', express.static(path.resolve(__dirname, '../dashboard/public')));
        server.use(express.json());
        server.use(express.urlencoded({ extended: false }));
        server.set('views', path.join(__dirname, '../dashboard/views'));

        server.set('view engine', 'ejs');

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

        server.get('/auth/twitch', (req, res) => {
            let url = 'https://id.twitch.tv/oauth2/authorize?' + querystring.stringify({
                client_id: client.config.clientId,
                redirect_uri: 'http://localhost:3000',
                response_type: 'code',
                scope: 'chat:read chat:edit'
            });

            res.redirect(url);
        });

server.get('/auth/twitch/callback', async (req, res) => {
  const code = req.query.code as string;
  const tokenUrl = 'https://id.twitch.tv/oauth2/token';
  
  // Prepare data for the token request
  const data = querystring.stringify({
    client_id: client.config.clientId,
    client_secret: client.config.clientSecret,
    code: code,
    grant_type: 'authorization_code',
    redirect_uri: 'http://localhost:3000',
  });

  try {
    // Send request to Twitch to get the access token using Superagent
    const response = await superagent
      .post(tokenUrl)
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send(data);

    // Parse response and get access token
    const { access_token, refresh_token } = response.body;

    // Store the access token and refresh token securely (e.g., in a database or session)
    res.json({ access_token, refresh_token });
  } catch (error) {
    console.error('Error exchanging code for access token:', error);
    res.status(500).send('Error exchanging code for access token');
  }
});

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

        client.server = server.listen(port, () => console.log(`Server listening on port ${port}`));
    }
}
