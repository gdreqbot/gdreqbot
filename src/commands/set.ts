import Gdreqbot from "../core";
import BaseCommand, { MsgData } from "../structs/BaseCommand";
import { ResCode, Settings } from "../modules/Request";

export = class SetCommand extends BaseCommand {
    constructor() {
        super({
            name: "set",
            description: "View or edit settings",
            args: "[<setting> <value>]",
            aliases: ["s", "settings"],
            enabled: true,
            devOnly: true
        });
    }

    async run(client: Gdreqbot, msg: MsgData, args: string[]): Promise<any> {
        let { channel } = msg;
        let sets: Settings = client.db.get("settings");

        if (!args?.length)
            return client.say(channel, `Settings: ${Object.entries(sets).map(s => `${s[0]}:${s[1]}`).join(" - ")}`);

        let res = await client.req.set(client, args[0], args[1]);

        switch (res.status) {
            case ResCode.INVALID_KEY: {
                client.say(channel, "Error: invalid key", { replyTo: msg.msg });
                break;
            }

            case ResCode.INVALID_VALUE: {
                client.say(channel, "Error: invalid value", { replyTo: msg.msg });
                break;
            }

            case ResCode.OK: {
                client.say(channel, `Set '${args[0]}' to '${args[1]}'`, { replyTo: msg.msg });
                break;
            }
        }
    }
}
