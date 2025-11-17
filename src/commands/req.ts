import Gdreqbot from "../core";
import BaseCommand from "../structs/BaseCommand";
import { ResCode } from "../modules/Request";
import { ChatMessage } from "@twurple/chat";
import { Settings } from "../datasets/settings";

export = class ReqCommand extends BaseCommand {
    constructor() {
        super({
            name: "req",
            description: "Request a level by name or ID",
            args: "<query>",
            aliases: ["r", "request", "add"],
            enabled: true
        });
    }

    async run(client: Gdreqbot, msg: ChatMessage, channel: string, args: string[]): Promise<any> {
        if (!args.length)
            return client.say(channel, "Kappa You need to specify a query.", { replyTo: msg });

        let res = await client.req.addLevel(client, msg.channelId, { userId: msg.userInfo.userId, userName: msg.userInfo.userName }, args.join(" "));
        let sets: Settings = client.db.load("settings", { channelId: msg.channelId });

        switch (res.status) {
            case ResCode.NOT_FOUND: {
                client.say(channel, "Kappa Couldn't find a level matching that query (is it unlisted?)", { replyTo: msg });
                break;
            }

            case ResCode.ALREADY_ADDED: {
                client.say(channel, "Kappa That level is already in the queue.", { replyTo: msg });
                break;
            }

            case ResCode.MAX_PER_USER: {
                client.say(channel, `Kappa You have the max amount of levels in the queue (${sets.max_per_user})`, { replyTo: msg });
                break;
            }

            case ResCode.FULL: {
                client.say(channel, `Kappa The queue is full (max ${sets.max_queue} levels)`, { replyTo: msg });
                break;
            }

            case ResCode.DISABLED: {
                client.say(channel, "Kappa Requests are disabled.", { replyTo: msg });
                break;
            }

            case ResCode.ERROR: {
                client.say(channel, "An error occurred.", { replyTo: msg });
                break;
            }

            case ResCode.OK: {
                client.say(channel, `PogChamp Added '${res.level.name}' (${res.level.id}) by ${res.level.creator} to the queue at position ${client.db.load("levels", { channelId: msg.channelId }).levels.length}`, { replyTo: msg });
                break;
            }
        }
    }
}
