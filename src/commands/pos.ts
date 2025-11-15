import Gdreqbot from "../core";
import BaseCommand, { MsgData } from "../structs/BaseCommand";
import { LevelData, ResCode } from "../modules/Request";

export = class PosCommand extends BaseCommand {
    constructor() {
        super({
            name: "pos",
            description: "Get your level's position in the queue, or a specific one",
            args: "[<query>]",
            aliases: ["p", "position"],
            enabled: true
        });
    }

    async run(client: Gdreqbot, msg: MsgData, args: string[]): Promise<any> {
        let { channel } = msg;
        let levels: LevelData[] = client.db.get("levels");
        let query = "";
        if (args[0]) {
            query = args.join(" ");
        } else {
            let usrLvls = levels.filter(l => l.user == msg.user);
            if (!usrLvls?.length)
                return client.say(channel, "Kappa You don't have any levels in the queue.", { replyTo: msg.msg });

            query = usrLvls[0].id;
        }

        let res = client.req.getLevel(client, query);

        switch (res.status) {
            case ResCode.EMPTY: {
                client.say(channel, "Kappa The queue is empty.", { replyTo: msg.msg });
                break;
            }

            case ResCode.NOT_FOUND: {
                client.say(channel, "Kappa That level is not in the queue.", { replyTo: msg.msg });
                break;
            }

            case ResCode.OK: {
                client.say(channel, `${args[0] ? `'${res.level.name}'` : `Your level (${res.level.name})`} is at position ${res.lvlPos} in the queue.`, { replyTo: msg.msg });
                break;
            }
        }
    }
}
