import { ChatMessage } from "@twurple/chat";
import Gdreqbot from "../core";
import BaseCommand from "../structs/BaseCommand";
import PermLevels from "../structs/PermLevels";

export = class SilentCommand extends BaseCommand {
    constructor() {
        super({
            name: "silent",
            description: "Toggle silent mode",
            category: "requests",
            aliases: ["silent-mode", "silentmode", "togglesilent", "togglesilentmode"],
            enabled: true,
            permLevel: PermLevels.MOD
        });
    }

    async run(client: Gdreqbot, msg: ChatMessage, channel: string, args: string[], opts: { auto: boolean }): Promise<any> {
        let toggle = await client.req.toggle(client, msg.channelId, "silent");
        let replyTo = opts.auto ? null : msg;

        client.say(channel, `Silent mode is now ${toggle ? "enabled" : "disabled"}. ${toggle ? "The bot will stop sending any messages in chat." : "The bot will send messages as usual."}`, { replyTo });
    }
}
