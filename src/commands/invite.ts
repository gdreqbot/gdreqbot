import { ChatMessage } from "@twurple/chat";
import Gdreqbot from "../modules/Bot";
import BaseCommand from "../structs/BaseCommand";

export = class PartCommand extends BaseCommand {
    constructor() {
        super({
            name: "invite",
            description: "Invite gdreqbot to your stream chat!",
            enabled: false
        });
    }

    async run(client: Gdreqbot, msg: ChatMessage, channel: string): Promise<any> {
        await client.say(channel, "You can add me to your stream chat at the following link: https://gdreqbot.ddns.net", { replyTo: msg });
    }
}
