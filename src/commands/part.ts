import { ChatMessage } from "@twurple/chat";
import Gdreqbot, { channelsdb } from "../core";
import BaseCommand from "../structs/BaseCommand";
import PermLevels from "../structs/PermLevels";
import { User } from "../structs/user";

export = class PartCommand extends BaseCommand {
    constructor() {
        super({
            name: "part",
            description: "Makes the bot part from the chat",
            aliases: ["leave"],
            permLevel: PermLevels.STREAMER,
            enabled: true
        });
    }

    async run(client: Gdreqbot, msg: ChatMessage, channel: string): Promise<any> {
        await client.say(channel, "Leaving the chat... Thanks for using gdreqbot!", { replyTo: msg });

        let channels: User[] = channelsdb.get("channels");
        let idx = channels.findIndex(c => c.userId == msg.channelId);
        channels.splice(idx, 1);

        await channelsdb.set("channels", channels);
        await client.db.deleteAll({ channelId: msg.channelId, channelName: channel });
        client.part(channel);
        client.logger.log(`←   Channel left: ${channel}`);
    }
}
