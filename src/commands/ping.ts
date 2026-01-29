import { ChatMessage } from "@twurple/chat";
import Gdreqbot from "../core";
import BaseCommand from "../structs/BaseCommand";

export = class PingCommand extends BaseCommand {
    constructor() {
        super({
            name: "ping",
            description: "Gives the bot latency",
            privilegeDesc: "Gives the privileged bot latency",
            enabled: true,
            supportsPrivilege: true
        });
    }

    async run(client: Gdreqbot, msg: ChatMessage, channel: string, args: string[], opts: { privilegeMode: boolean }): Promise<any> {
        if (opts.privilegeMode)
            await client.say(channel, "privileged pong", { replyTo: msg });
        else
            await client.say(channel, "pong", { replyTo: msg });
    }
}
