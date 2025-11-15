import Gdreqbot from "../core";
import BaseCommand, { MsgData } from "../structs/BaseCommand";
import { ResCode, Settings } from "../modules/Request";

export = class ClearCommand extends BaseCommand {
    constructor() {
        super({
            name: "clear",
            description: "Clear the queue",
            aliases: ["purge"],
            enabled: true,
            devOnly: true
        });
    }

    async run(client: Gdreqbot, msg: MsgData, args: string[]): Promise<any> {
        let { channel } = msg;
        let res = await client.req.clear(client);

        switch (res.status) {
            case ResCode.EMPTY: {
                client.say(channel, "Kappa The queue is empty.", { replyTo: msg.msg });
                break;
            }

            case ResCode.OK: {
                client.say(channel, `PogChamp Queue cleared.`, { replyTo: msg.msg });
                break;
            }
        }
    }
}
