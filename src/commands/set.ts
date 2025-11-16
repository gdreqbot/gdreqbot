import Gdreqbot from "../core";
import BaseCommand from "../structs/BaseCommand";
import { ResCode, Settings } from "../modules/Request";
import { ChatMessage } from "@twurple/chat";
import PermLevels from "../structs/PermLevels";

export = class SetCommand extends BaseCommand {
    constructor() {
        super({
            name: "set",
            description: "View or edit settings",
            args: "[<setting> <value>]",
            aliases: ["s", "settings"],
            enabled: true,
            permLevel: PermLevels.MOD
        });
    }

    async run(client: Gdreqbot, msg: ChatMessage, channel: string, args: string[]): Promise<any> {
        let sets: Settings = client.db.get("settings");

        if (!args?.length)
            return client.say(channel, `Settings: ${Object.entries(sets).map(s => `${s[0]}:${s[1]}`).join(" - ")}`);

        let res = await client.req.set(client, args[0], args[1]);

        switch (res.status) {
            case ResCode.INVALID_KEY: {
                client.say(channel, "Error: invalid key", { replyTo: msg });
                break;
            }

            case ResCode.INVALID_VALUE: {
                client.say(channel, "Error: invalid value", { replyTo: msg });
                break;
            }

            case ResCode.OK: {
                client.say(channel, `Set '${args[0]}' to '${args[1]}'`, { replyTo: msg });
                break;
            }
        }
    }
}
