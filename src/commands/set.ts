import Gdreqbot from "../core";
import BaseCommand from "../structs/BaseCommand";
import { ResCode } from "../modules/Request";
import { ChatMessage } from "@twurple/chat";
import PermLevels from "../structs/PermLevels";
import { Settings } from "../datasets/settings";

export = class SetCommand extends BaseCommand {
    constructor() {
        super({
            name: "set",
            description: "View or edit settings",
            args: "[<setting> <value>] (for numeric options, -1 disables it)",
            aliases: ["s", "settings"],
            enabled: true,
            permLevel: PermLevels.MOD
        });
    }

    async run(client: Gdreqbot, msg: ChatMessage, channel: string, args: string[]): Promise<any> {
        let sets: Settings = client.db.load("settings", { channelId: msg.channelId });

        if (!args?.length)
            return client.say(channel, `Settings: ${Object.entries(sets).slice(2).map(s => `${s[0]}:${s[1]}`).join(" - ")}`);

        let res = await client.req.set(client, msg.channelId, args[0], args[1]);

        switch (res.status) {
            case ResCode.INVALID_KEY: {
                client.say(channel, "Error: invalid setting", { replyTo: msg });
                break;
            }

            case ResCode.INVALID_VALUE: {
                client.say(channel, "Error: invalid value", { replyTo: msg });
                break;
            }

            case ResCode.INVALID_RANGE: {
                client.say(channel, "Error: value must be either -1 or greater than 0");
                break;
            }

            case ResCode.OK: {
                client.say(channel, `Set '${args[0]}' to '${args[1]}'`, { replyTo: msg });
                break;
            }
        }
    }
}
