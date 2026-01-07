import { ChatMessage } from "@twurple/chat";
import Gdreqbot from "../core";
import BaseCommand from "../structs/BaseCommand";
import PermLevels from "../structs/PermLevels";
import { Settings } from "../datasets/settings";

export = class RandomCommand extends BaseCommand {
    constructor() {
        super({
            name: "random",
            description: "Toggle the random queue",
            category: "requests",
            aliases: ["rndm", "togglerandom", "randomqueue", "randomq", "rndmq"],
            enabled: true,
            permLevel: PermLevels.MOD
        });
    }

    async run(client: Gdreqbot, msg: ChatMessage, channel: string): Promise<any> {
        let sets: Settings = client.db.load("settings", { channelId: msg.channelId });
        let random = await client.req.toggleRandom(client, msg.channelId);

        client.say(channel, `Random queue is now ${random ? "enabled" : "disabled"}. ${random ? `Typing ${sets.prefix ?? client.config.prefix}next will now pick a random level from the queue.` : "The queue order is followed as normal."}`, { replyTo: msg });
    }
}
