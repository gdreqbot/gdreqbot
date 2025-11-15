import Gdreqbot from "../core";
import { LevelData, ResCode } from "../modules/Request";
import BaseCommand, { MsgData } from "../structs/BaseCommand";

export = class HelpCommand extends BaseCommand {
    constructor() {
        super({
            name: "help",
            description: "Lists commands",
            args: "[<command>]",
            aliases: ["h", "?", "commands", "cmd"],
            enabled: true
        });
    }

    async run(client: Gdreqbot, msg: MsgData, args: string[]): Promise<any> {
        let { channel } = msg;
        let cmd = client.commands.get(args[0])
            || client.commands.values().find(c => c.config.aliases.includes(args[0]));

        if (args[0] && !cmd)
            return client.say(channel, "Kappa That command doesn't exist.", { replyTo: msg.msg });
        else if (cmd)
            return client.say(channel, `${process.env.PREFIX}${cmd.config.name}: ${cmd.config.description} | args: ${cmd.config.args ? `${process.env.PREFIX}${cmd.config.name} ${cmd.config.args}` : "none"} | aliases: ${cmd.config.aliases?.join(", ") || "none"}`, { replyTo: msg.msg });
        else
            client.say(channel, `${process.env.PREFIX}help <command> for more info | ${client.commands.values().filter(c => !c.config.devOnly).map(c => `${process.env.PREFIX}${c.config.name}`).toArray().join(" - ")}`, { replyTo: msg.msg });
    }
}
