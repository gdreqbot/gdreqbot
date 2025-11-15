import Gdreqbot from "../core";
import BaseCommand, { MsgData } from "../structs/BaseCommand";

export = class ToggleCommand extends BaseCommand {
    constructor() {
        super({
            name: "toggle",
            description: "Toggle requests",
            aliases: ["t"],
            enabled: true,
            devOnly: true
        });
    }

    async run(client: Gdreqbot, msg: MsgData): Promise<any> {
        let toggle = await client.req.toggle(client);
        client.say(msg.channel, `Requests are now ${toggle ? "enabled" : "disabled"}.`, { replyTo: msg.msg });
    }
}
