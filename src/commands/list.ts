import { ChatMessage } from "@twurple/chat";
import Gdreqbot from "../core";
import { ResCode } from "../modules/Request";
import BaseCommand from "../structs/BaseCommand";
import { LevelData } from "../datasets/levels";
import { Settings } from "../datasets/settings";

export = class ListCommand extends BaseCommand {
    constructor() {
        super({
            name: "list",
            description: "Lists levels in the queue",
            category: "requests",
            args: "[<page>]",
            aliases: ["l", "q", "queue"],
            enabled: true
        });
    }

    async run(client: Gdreqbot, msg: ChatMessage, channel: string, args: string[]): Promise<any> {
        let levels: LevelData[] = client.db.load("levels", { channelId: msg.channelId }).levels;
        let sets: Settings = client.db.load("settings", { channelId: msg.channelId });

        let page = parseInt(args[0]);
        if (args[0] && isNaN(page))
            return client.say(channel, "Kappa Sir that's not a number.", { replyTo: msg });

        let res = client.req.list(client, msg.channelId, page);

        switch (res.status) {
            case ResCode.EMPTY: {
                client.say(channel, "Kappa The queue is empty.", { replyTo: msg });
                break;
            }

            case ResCode.END: {
                client.say(channel, "Kappa There aren't that many pages.", { replyTo: msg });
                break;
            }

            case ResCode.OK: {
                client.say(channel, `${sets.random_queue ? "[RANDOM ORDER] " : ""}Page ${page || "1"} of ${res.pages} (${levels.length} levels) | ${res.page.map(l => `${l.pos}. ${l.name} (${l.id})`).join(" - ")}`, { replyTo: msg });
                break;
            }
        }
    }
}
