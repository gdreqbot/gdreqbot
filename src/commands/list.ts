import Gdreqbot from "../core";
import { LevelData, ResCode } from "../modules/Request";
import BaseCommand, { MsgData } from "../structs/BaseCommand";

export = class ListCommand extends BaseCommand {
    constructor() {
        super({
            name: "list",
            description: "Lists levels in the queue",
            args: "[<page>]",
            aliases: ["l", "q", "queue"],
            enabled: true
        });
    }

    async run(client: Gdreqbot, msg: MsgData, args: string[]): Promise<any> {
        let { channel } = msg;
        let levels: LevelData[] = client.db.get("levels");
        let page = parseInt(args[0]);
        if (args[0] && isNaN(page))
            return client.say(channel, "Kappa Sir that's not a number.", { replyTo: msg.msg });

        let res = client.req.list(client, page);

        switch (res.status) {
            case ResCode.EMPTY: {
                client.say(channel, "Kappa The queue is empty.", { replyTo: msg.msg });
                break;
            }

            case ResCode.END: {
                client.say(channel, "Kappa There aren't that many pages.", { replyTo: msg.msg });
                break;
            }

            case ResCode.OK: {
                client.say(channel, `Page ${page || "1"} of ${res.pages} (${levels.length} levels) | ${res.page.map(l => `${l.pos}. ${l.name} (${l.id})`).join(" - ")}`, { replyTo: msg.msg });
                break;
            }
        }
    }
}
