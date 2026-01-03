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
            category: "requests",
            args: "<query>",
            aliases: ["r", "request", "add"],
            enabled: true
        });
    }

    async run(client: Gdreqbot, msg: ChatMessage, channel: string, args: string[]): Promise<any> {
        if (!args.length)
            return client.say(channel, "Kappa You need to specify a query.", { replyTo: msg });

        let res = await client.req.addLevel(client, msg.channelId, { userId: msg.userInfo.userId, userName: msg.userInfo.userName }, args[1] == "idreq" ? args[0] : args.join(" "));
        let sets: Settings = client.db.load("settings", { channelId: msg.channelId });

        switch (res.status) {
            case ResCode.NOT_FOUND: {
                client.say(channel, `Kappa Couldn't find a level matching that ${args[1] == "idreq" ? "ID" : "query"} (is it unlisted?)`, { replyTo: msg });
                break;
            }

            case ResCode.ALREADY_ADDED: {
                client.say(channel, "Kappa That level is already in the queue.", { replyTo: msg });
                break;
            }

            case ResCode.MAX_PER_USER: {
                client.say(channel, `Kappa You have the max amount of levels in the queue (${sets.max_levels_per_user})`, { replyTo: msg });
                break;
            }

            case ResCode.FULL: {
                client.say(channel, `Kappa The queue is full (max ${sets.max_queue_size} levels)`, { replyTo: msg });
                break;
            }

            case ResCode.DISABLED: {
                client.say(channel, "Kappa Requests are disabled.", { replyTo: msg });
                break;
            }

            case ResCode.BLACKLISTED: {
                client.say(channel, "Kappa That level is blacklisted.", { replyTo: msg });
                break;
            }

            case ResCode.ERROR: {
                client.say(channel, "An error occurred. If the issue persists, please contact the developer.", { replyTo: msg });
                break;
            }

            case ResCode.OK: {
                client.say(channel, `PogChamp Added '${res.level.name}' (${res.level.id}) by ${res.level.creator} to the queue at position ${client.db.load("levels", { channelId: msg.channelId }).levels.length}`, { replyTo: msg });

                if (args[1] == "idreq") client.logger.log(`Added level in channel: ${channel}`);
                break;
            }

            default:
                client.say(channel, "the dev forgot what to put here ¯\\_(ツ)_/¯");
                client.logger.warn("req case missing");
                break;
        }
    }
}
