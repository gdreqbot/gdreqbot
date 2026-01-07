import Gdreqbot from "../core";
import BaseCommand from "../structs/BaseCommand";
import { ResCode } from "../modules/Request";
import { ChatMessage } from "@twurple/chat";
import PermLevels from "../structs/PermLevels";
import { LevelData } from "../datasets/levels";

export = class RemoveCommand extends BaseCommand {
    constructor() {
        super({
            name: "remove",
            description: "Remove your last level from the queue",
            category: "requests",
            privilegeDesc: "Remove the overall last level from the queue, or a specific one",
            privilegeArgs: "[<query>]",
            aliases: ["rm", "oops"],
            enabled: true,
            supportsPrivilege: true
        });
    }

    async run(client: Gdreqbot, msg: ChatMessage, channel: string, args: string[], userPerms: PermLevels, privilegeMode: boolean): Promise<any> {
        let levels: LevelData[] = client.db.load("levels", { channelId: msg.channelId }).levels;
        let query = "";
        if (privilegeMode) {
            if (args[0])
                query = args.join(" ");
            else query = levels[levels.length-1]?.id;
        } else {
            let usrLvls = levels.filter(l => l.user.userId == msg.userInfo.userId);
            if (!usrLvls?.length)
                return client.say(channel, "Kappa You don't have any levels in the queue.", { replyTo: msg });

            query = usrLvls[usrLvls.length - 1].id;
        }

        let res = await client.req.removeLevel(client, msg.channelId, query);

        switch (res.status) {
            case ResCode.EMPTY: {
                client.say(channel, "Kappa The queue is empty.", { replyTo: msg });
                break;
            }

            case ResCode.NOT_FOUND: {
                client.say(channel, "Kappa That level is not in the queue.", { replyTo: msg });
                break;
            }

            case ResCode.ERROR: {
                client.say(channel, "An error occurred. If the issue persists, please contact the developer.", { replyTo: msg });
                break;
            }

            case ResCode.OK: {
                client.say(channel, `PogChamp Removed '${res.level[0].name}' by ${res.level[0].creator} from the queue.`, { replyTo: msg });
                break;
            }
        }
    }
}
