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
            args: "<query> [<notes>]",
            aliases: ["r", "request", "add", "join"],
            enabled: true,
            supportsSilent: true
        });
    }

    async run(client: Gdreqbot, msg: ChatMessage, channel: string, args: string[], opts: { auto: boolean, silent: boolean }): Promise<any> {
        if (!args.length) {
            if (!opts.silent)
                return client.say(channel, "Kappa You need to specify a query (level name or ID).", { replyTo: msg });
            else
                return;
        }

        let notes;

        if (opts.auto) {
            notes = args[1];
        } else if (!opts.auto && !isNaN(parseInt(args[0]))) {
            if (args.slice(1).length)
                notes = args.slice(1).join(" ");
        } else
            notes = null;

        let res = await client.req.addLevel(client, msg.channelId, { userId: msg.userInfo.userId, userName: msg.userInfo.userName },
            opts.auto || notes ? args[0] : args.join(" "),
            notes
        );
        let sets: Settings = client.db.load("settings", { channelId: msg.channelId });

        switch (res.status) {
            case ResCode.NOT_FOUND: {
                if (!opts.silent) client.say(channel, `Kappa Couldn't find a level matching that ${opts.auto ? "ID" : "query"} (is it unlisted?)`, { replyTo: msg });
                break;
            }

            case ResCode.ALREADY_ADDED: {
                if (!opts.silent) client.say(channel, "Kappa That level is already in the queue.", { replyTo: msg });
                break;
            }

            case ResCode.MAX_PER_USER: {
                if (!opts.silent) client.say(channel, `Kappa You have the max amount of levels in the queue (${sets.max_levels_per_user})`, { replyTo: msg });
                break;
            }

            case ResCode.FULL: {
                if (!opts.silent) client.say(channel, `Kappa The queue is full (max ${sets.max_queue_size} levels)`, { replyTo: msg });
                break;
            }

            case ResCode.DISABLED: {
                if (!opts.silent) client.say(channel, `Kappa Requests are disabled.${sets.first_time ? ` (enable in the dashboard, or use ${sets.prefix ?? client.config.prefix}toggle)` : ""}`, { replyTo: msg });
                break;
            }

            case ResCode.BLACKLISTED: {
                if (!opts.silent) client.say(channel, "Kappa That level is blacklisted.", { replyTo: msg });
                break;
            }

            case ResCode.GLOBAL_BL:
                break;

            case ResCode.ERROR: {
                client.say(channel, "An error occurred, please try again. (If the issue persists, please contact the developer)", { replyTo: msg });
                break;
            }

            case ResCode.OK: {
                if (!opts.silent) client.say(channel, `PogChamp Added '${res.level.name}' (${res.level.id}) by ${res.level.creator} to the queue at position ${client.db.load("levels", { channelId: msg.channelId }).levels.length}`, { replyTo: msg });

                if (opts.auto) client.logger.log(`Added level in channel: ${channel}`);
                break;
            }

            default:
                client.say(channel, "the dev forgot what to put here ¯\\_(ツ)_/¯");
                client.logger.warn("req case missing");
                break;
        }
    }
}
