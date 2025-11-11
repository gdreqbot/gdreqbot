import { StaticAuthProvider } from "@twurple/auth";
import { Bot, createBotCommand } from "@twurple/easy-bot";
import { config } from "dotenv";
config();

const clientId = process.env.CLIENT_ID as string;
const token = process.env.USER_TOKEN as string;
const authProvider = new StaticAuthProvider(clientId, token);

const bot = new Bot({ authProvider, channels: ["galaxyvinci05"] });
