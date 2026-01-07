import Gdreqbot from "../core";
import BaseCommand from "../structs/BaseCommand";
import { ResCode } from "../modules/Request";
import { ChatMessage } from "@twurple/chat";
import PermLevels from "../structs/PermLevels";

export = class SwapCommand extends BaseCommand {
    constructor() {
        super({
            name: "swap",
            description: "Swap the position of two levels in the queue",
            category: "requests",
            args: "\"<level1>\" \"<level2>\"",
            aliases: ["sw", "switch"],
            enabled: true,
            permLevel: PermLevels.MOD
        });
    }

    async run(client: Gdreqbot, msg: ChatMessage, channel: string, args: string[]): Promise<any> {
        if (args?.length < 2) return client.say(channel, "Kappa You need to specify two levels to swap. (Specify both in quotes if a level name has a space)", { replyTo: msg });
        let query: string[] = [];
        let separator = "";

        if (args.some(a => a.includes("\"")))
            separator = "\"";
        else if (args.some(a => a.includes("'")))
            separator = "'";

        if (separator.length) {
            let fullStr = args.join(" ");
            query[0] = fullStr.split(separator)[1];
            query[1] = fullStr.split(separator)[3];
        } else {
            query = args;
        }

        let res = await client.req.swapLevels(client, msg.channelId, query[0], query[1]);

        switch (res.status) {
            case ResCode.EMPTY: {
                client.say(channel, "Kappa The queue is empty.", { replyTo: msg });
                break;
            }

            case ResCode.NOT_FOUND: {
                client.say(channel, `Kappa The level '${query[res.query]}' is not in the queue.`, { replyTo: msg });
                break;
            }

            case ResCode.OK: {
                client.say(channel, `PogChamp Swapped '${res.levels[0].level.name}' (${res.levels[0].level.id}) at position ${res.levels[0].pos+1} with '${res.levels[1].level.name}' (${res.levels[1].level.id}) at position ${res.levels[1].pos+1}`)
            }
        }
    }
}
