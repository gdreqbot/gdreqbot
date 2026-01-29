import Gdreqbot from "../core";
import BaseCommand from "../structs/BaseCommand";
import { ResCode } from "../modules/Request";
import { ChatMessage } from "@twurple/chat";
import PermLevels from "../structs/PermLevels";

export = class ClearCommand extends BaseCommand {
    constructor() {
        super({
            name: "clear",
            description: "Clear the queue",
            category: "requests",
            aliases: ["purge"],
            enabled: true,
            permLevel: PermLevels.MOD,
            supportsSilent: true
        });
    }

    async run(client: Gdreqbot, msg: ChatMessage, channel: string, args: string[], opts: { auto: boolean, silent: boolean }): Promise<any> {
        let res = await client.req.clear(client, msg.channelId);
        let replyTo = opts.auto ? null : msg;

        switch (res.status) {
            case ResCode.EMPTY: {
                client.say(channel, "Kappa The queue is empty.", { replyTo });
                break;
            }

            case ResCode.OK: {
                if (!opts.silent) client.say(channel, `PogChamp Queue cleared.`, { replyTo });
                break;
            }
        }
    }
}
