import { ChatMessage } from "@twurple/chat";
import Gdreqbot from "../core";
import BaseCommand from "../structs/BaseCommand";
import PermLevels from "../structs/PermLevels";
import { Settings } from "../datasets/settings";

export = class ToggleCommand extends BaseCommand {
    constructor() {
        super({
            name: "toggle",
            description: "Toggle requests",
            category: "requests",
            aliases: ["t"],
            enabled: true,
            permLevel: PermLevels.MOD
        });
    }

    async run(client: Gdreqbot, msg: ChatMessage, channel: string): Promise<any> {
        let sets: Settings = client.db.load("settings", { channelId: msg.channelId });
        let toggle = await client.req.toggle(client, msg.channelId);

        if (sets.first_time) await client.db.save("settings", { channelId: msg.channelId }, { first_time: false });
        client.say(channel, `Requests are now ${toggle ? "enabled" : "disabled"}.`, { replyTo: msg });
    }
}
