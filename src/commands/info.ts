import Gdreqbot from "../core";
import BaseCommand from "../structs/BaseCommand";
import { ResCode } from "../modules/Request";
import { ChatMessage } from "@twurple/chat";

export = class InfoCommand extends BaseCommand {
    constructor() {
        super({
            name: "info",
            description: "Get info for a level in the queue",
            category: "requests",
            args: "[<query>]",
            aliases: ["i", "get", "g"],
            enabled: true
        });
    }

    async run(client: Gdreqbot, msg: ChatMessage, channel: string, args: string[]): Promise<any> {
        let res = client.req.getLevel(client, msg.channelId, args.join(" "));

        switch (res.status) {
            case ResCode.EMPTY: {
                client.say(channel, "Kappa The queue is empty.", { replyTo: msg });
                break;
            }

            case ResCode.NOT_FOUND: {
                client.say(channel, "Kappa Couldn't find that level.", { replyTo: msg });
                break;
            }

            case ResCode.OK: {
                client.say(channel, `${args[0] ? "Level Info" : "Now Playing"} | Level: '${res.level.name}' | Creator: ${res.level.creator} | ID: ${res.level.id} | Requested by: ${res.level.user.userName} | Notes: ${res.level.notes ?? "none"}`, { replyTo: msg });
                break;
            }
        }
    }
}
