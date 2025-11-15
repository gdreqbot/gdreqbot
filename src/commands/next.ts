import Gdreqbot from "../core";
import { LevelData, ResCode } from "../modules/Request";
import BaseCommand, { MsgData } from "../structs/BaseCommand";

export = class NextCommand extends BaseCommand {
    constructor() {
        super({
            name: "next",
            description: "Shifts the queue",
            aliases: ["n"],
            enabled: true,
            devOnly: true
        });
    }

    async run(client: Gdreqbot, msg: MsgData): Promise<any> {
        let { channel } = msg;
        let res = await client.req.next(client);

        switch (res.status) {
            case ResCode.EMPTY: {
                client.say(channel, "Kappa The queue is empty.", { replyTo: msg.msg });
                break;
            }

            case ResCode.ERROR: {
                client.say(channel, "An error occurred.", { replyTo: msg.msg });
                break;
            }

            case ResCode.OK: {
                client.say(msg.channel, `PogChamp Next level: '${res.level.name}' (${res.level.id}) by ${res.level.creator}`, { replyTo: msg.msg });
                break;
            }
        }
    }
}
