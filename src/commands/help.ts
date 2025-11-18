import { ChatMessage } from "@twurple/chat";
import Gdreqbot from "../core";
import BaseCommand from "../structs/BaseCommand";
import PermLevels from "../structs/PermLevels";
import { Perm } from "../datasets/perms";

export = class HelpCommand extends BaseCommand {
    constructor() {
        super({
            name: "help",
            description: "Lists commands",
            privilegeDesc: "Lists commands that support privilege mode",
            args: "[<command>]",
            privilegeArgs: "[<command>]",
            aliases: ["h", "?", "commands", "cmd"],
            enabled: true,
            supportsPrivilege: true
        });
    }

    async run(client: Gdreqbot, msg: ChatMessage, channel: string, args: string[], userPerms: PermLevels, privilegeMode: boolean): Promise<any> {
        let cmd = client.commands.get(args[0])
            || client.commands.values().find(c => c.config.aliases.includes(args[0]));

        if (args[0] && !cmd)
            return client.say(channel, "Kappa That command doesn't exist.", { replyTo: msg });

        let str;
        if (privilegeMode) {
            if (cmd) {
                if (!cmd.config.supportsPrivilege)
                    return client.say(channel, "That command doesn't support privilege mode.", { replyTo: msg });

                str = `${client.config.prefix}pr ${cmd.config.name}: ${cmd.config.privilegeDesc} | args: ${cmd.config.privilegeArgs ? `${client.config.prefix}pr ${cmd.config.name} ${cmd.config.privilegeArgs}` : "none"}`;
            } else {
                str = `${client.config.prefix}pr help <command> for more info | ${client.commands.values().filter(c => c.config.supportsPrivilege).map(c => `${client.config.prefix}pr ${c.config.name}`).toArray().join(" - ")}`
            }
        } else {
            let perms: Perm[] = client.db.load("perms", { channelId: msg.channelId }).perms;

            if (cmd) {
                let customPerm = perms?.find(p => p.cmd == cmd.config.name);

                str = `${client.config.prefix}${cmd.config.name}: ${cmd.config.description} | args: ${cmd.config.args ? `${client.config.prefix}${cmd.config.name} ${cmd.config.args}` : "none"} | aliases: ${cmd.config.aliases?.join(", ") || "none"} | required perm: ${PermLevels[customPerm?.perm || cmd.config.permLevel]}`;
            } else {
                str = `${client.config.prefix}help <command> for more info | ${client.commands.values().filter(c => (perms?.find(p => p.cmd == c.config.name)?.perm || c.config.permLevel) <= userPerms).map(c => `${client.config.prefix}${c.config.name}`).toArray().join(" - ")}`;
            }
        }

        await client.say(channel, str, { replyTo: msg });
    }
}
