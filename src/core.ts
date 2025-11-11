import { StaticAuthProvider } from "@twurple/auth";
import { ChatClient } from "@twurple/chat";
import fs from "fs";
import { config } from "dotenv";
config();

const clientId = process.env.CLIENT_ID as string;
const token = process.env.USER_TOKEN as string;
const authProvider = new StaticAuthProvider(clientId, token);

class gdreqbot extends ChatClient {
    
}

const cmdFiles = fs.readdirSync("./dist/commands/").filter(f => f.endsWith(".js"));
const evtFiles = fs.readdirSync("./dist/events/").filter(f => f.endsWith(".js"));

const client = new ChatClient({
    authProvider,
    channels: ["galaxyvinci05"],
});
//const bot = new Bot({
//    authProvider,
//    channels: ["galaxyvinci05"],
//    commands: [
//        createBotCommand("shish", (params, { reply }) => {
//            reply("shish");
//        })
//    ]
//});

client.onMessage((channel, user, text, msg) => {
    
});
