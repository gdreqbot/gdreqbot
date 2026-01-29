import Gdreqbot from "../core";
import BaseCommand from "../structs/BaseCommand";
import { ResCode } from "../modules/Request";
import { ChatMessage } from "@twurple/chat";
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
            supportsPrivilege: true,
            supportsSilent: true,
        });
    }

    async run(client: Gdreqbot, msg: ChatMessage, channel: string, args: string[], opts: { privilegeMode: boolean, auto: boolean, silent: boolean }): Promise<any> {
        let replyTo = opts.auto ? null : msg;

        let levels: LevelData[] = client.db.load("levels", { channelId: msg.channelId }).levels;
        let query = "";
        if (opts.privilegeMode) {
            if (args[0])
                query = args.join(" ");
            else query = levels[levels.length-1]?.id;
        } else {
            let usrLvls = levels.filter(l => l.user.userId == msg.userInfo.userId);
            if (!usrLvls?.length) {
                if (!opts.silent)
                    return client.say(channel, "Kappa You don't have any levels in the queue.", { replyTo });
                else
                    return;
            }

            query = usrLvls[usrLvls.length - 1].id;
        }

        let res = await client.req.removeLevel(client, msg.channelId, query);

        switch (res.status) {
            case ResCode.EMPTY: {
                if (!opts.silent) client.say(channel, "Kappa The queue is empty.", { replyTo });
                break;
            }

            case ResCode.NOT_FOUND: {
                if (!opts.silent) client.say(channel, "Kappa That level is not in the queue.", { replyTo });
                break;
            }

            case ResCode.ERROR: {
                client.say(channel, "An error occurred, please try again. (If the issue persists, please contact the developer)", { replyTo });
                break;
            }

            case ResCode.OK: {
                if (!opts.silent) client.say(channel, `PogChamp Removed '${res.level[0].name}' by ${res.level[0].creator} from the queue.`, { replyTo });
                break;
            }
        }
    }
}
