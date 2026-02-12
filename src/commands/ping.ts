import { ChatMessage } from "@twurple/chat";
import Gdreqbot from "../modules/Bot";
import BaseCommand from "../structs/BaseCommand";
import PermLevels from "../structs/PermLevels";

export = class PingCommand extends BaseCommand {
    constructor() {
        super({
            name: "ping",
            description: "Gives the bot latency",
            privilegeDesc: "Gives the privileged bot latency",
            enabled: true,
            permLevel: PermLevels.DEV
        });
    }

    async run(client: Gdreqbot, msg: ChatMessage, channel: string): Promise<any> {
        await client.say(channel, "pong", { replyTo: msg });
    }
}
