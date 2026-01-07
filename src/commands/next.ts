import { ChatMessage } from "@twurple/chat";
import Gdreqbot from "../core";
import { ResCode } from "../modules/Request";
import BaseCommand from "../structs/BaseCommand";
import PermLevels from "../structs/PermLevels";

export = class NextCommand extends BaseCommand {
    constructor() {
        super({
            name: "next",
            description: "Shifts the queue",
            category: "requests",
            aliases: ["n", "skip"],
            enabled: true,
            permLevel: PermLevels.MOD
        });
    }

    async run(client: Gdreqbot, msg: ChatMessage, channel: string): Promise<any> {
        let res = await client.req.next(client, msg.channelId);

        switch (res.status) {
            case ResCode.EMPTY: {
                client.say(channel, "Kappa The queue is empty.", { replyTo: msg });
                break;
            }

            case ResCode.ERROR: {
                client.say(channel, "An error occurred.", { replyTo: msg });
                break;
            }

            case ResCode.OK: {
                client.say(channel, `PogChamp Next ${res.random ? "random " : ""}level: '${res.level.name}' (${res.level.id}) by ${res.level.creator}`, { replyTo: msg });
                break;
            }
        }
    }
}
