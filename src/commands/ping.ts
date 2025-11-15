import Gdreqbot from "../core";
import BaseCommand, { MsgData } from "../structs/BaseCommand";

export = class PingCommand extends BaseCommand {
    constructor() {
        super({
            name: "ping",
            description: "Gives the bot latency",
            enabled: true
        });
    }

    async run(client: Gdreqbot, msg: MsgData): Promise<any> {
        await client.say(msg.channel, "pong", { replyTo: msg.msg });
    }
}
