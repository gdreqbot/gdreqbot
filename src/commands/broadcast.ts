import Gdreqbot from "../modules/Bot";
import BaseCommand from "../structs/BaseCommand";
import { ChatMessage } from "@twurple/chat";
import PermLevels from "../structs/PermLevels";
import { sessions } from "../core";

export = class BroadcastCommand extends BaseCommand {
    constructor() {
        super({
            name: "broadcast",
            description: "Broadcast to active sessions",
            enabled: true,
            permLevel: PermLevels.DEV
        });
    }

    async run(client: Gdreqbot, msg: ChatMessage, channel: string, args: string[]): Promise<any> {
        if (!args?.length) return;
        if (!sessions?.length) return client.say(channel, "No active sessions");

        for (let i = 0; i < sessions.length; i++)
            client.say(sessions[i].userName, `>> BROADCAST: ${args.join(" ")}`);
    }
}
