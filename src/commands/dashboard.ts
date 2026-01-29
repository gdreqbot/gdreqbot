import { ChatMessage } from "@twurple/chat";
import Gdreqbot from "../core";
import BaseCommand from "../structs/BaseCommand";
import PermLevels from "../structs/PermLevels";

export = class DashboardCommand extends BaseCommand {
    constructor() {
        super({
            name: "dashboard",
            description: "Gives the dashboard link",
            aliases: ["dash", "board", "levelrequests", "requests"],
            enabled: true,
            permLevel: PermLevels.STREAMER
        });
    }

    async run(client: Gdreqbot, msg: ChatMessage, channel: string): Promise<any> {
        client.say(channel, `Dashboard link: ${process.env.URL}/dashboard`);
    }
}
