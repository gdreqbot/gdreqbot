import Gdreqbot from "../core";
import BaseCommand from "../structs/BaseCommand";
import { ResCode } from "../modules/Request";
import { ChatMessage } from "@twurple/chat";
import { LevelData } from "../datasets/levels";
import { Settings } from "../datasets/settings";

export = class PosCommand extends BaseCommand {
    constructor() {
        super({
            name: "pos",
            description: "Get your level's position in the queue, or a specific one",
            category: "requests",
            args: "[<query>]",
            aliases: ["p", "position"],
            enabled: true
        });
    }

    async run(client: Gdreqbot, msg: ChatMessage, channel: string, args: string[]): Promise<any> {
        let levels: LevelData[] = client.db.load("levels", { channelId: msg.channelId }).levels;
        let sets: Settings = client.db.load("settings", { channelId: msg.channelId });

        let query = "";
        if (args[0]) {
            query = args.join(" ");
        } else {
            let usrLvls = levels.filter(l => l.user.userName == msg.userInfo.userName); // todo: change to userId
            if (!usrLvls?.length)
                return client.say(channel, "Kappa You don't have any levels in the queue.", { replyTo: msg });

            query = usrLvls[0].id;
        }

        let res = client.req.getLevel(client, msg.channelId, query);

        switch (res.status) {
            case ResCode.EMPTY: {
                client.say(channel, "Kappa The queue is empty.", { replyTo: msg });
                break;
            }

            case ResCode.NOT_FOUND: {
                client.say(channel, "Kappa That level is not in the queue.", { replyTo: msg });
                break;
            }

            case ResCode.OK: {
                client.say(channel, `${args[0] ? `'${res.level.name}'` : `Your level (${res.level.name})`} is at position ${res.pos+1} in the queue.${sets.random_queue ? " [RANDOM ORDER]" : ""}`, { replyTo: msg });
                break;
            }
        }
    }
}
