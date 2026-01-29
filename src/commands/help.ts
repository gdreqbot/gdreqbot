import { ChatMessage } from "@twurple/chat";
import Gdreqbot from "../core";
import BaseCommand from "../structs/BaseCommand";
import PermLevels from "../structs/PermLevels";
import { Perm } from "../datasets/perms";
import { Settings } from "../datasets/settings";

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

    async run(client: Gdreqbot, msg: ChatMessage, channel: string, args: string[], opts: { userPerms: PermLevels, privilegeMode: boolean }): Promise<any> {
        let cmd = client.commands.get(args[0])
            || client.commands.values().find(c => c.config.aliases.includes(args[0]));

        if (args[0] && !cmd)
            return client.say(channel, "Kappa That command doesn't exist.", { replyTo: msg });

        let sets: Settings = client.db.load("settings", { channelId: msg.channelId });
        let str;

        if (opts.privilegeMode) {
            if (cmd) {
                if (!cmd.config.supportsPrivilege)
                    return client.say(channel, "That command doesn't support privilege mode.", { replyTo: msg });

                str = `${sets.prefix ?? client.config.prefix}pr ${cmd.info.name}: ${sets.prefix ? cmd.info.privilegeDesc.replace(client.config.prefix, sets.prefix) : cmd.info.privilegeDesc} | args: ${cmd.info.privilegeArgs ? `${sets.prefix ?? client.config.prefix}pr ${cmd.info.name} ${cmd.info.privilegeArgs}` : "none"}`;
                if (sets.prefix) str.replace(client.config.prefix, sets.prefix);
            } else {
                str = `${sets.prefix ?? client.config.prefix}pr help <command> for more info | ${client.commands.values().filter(c => c.config.supportsPrivilege).map(c => `${sets.prefix?? client.config.prefix}pr ${c.info.name}`).toArray().join(sets.prefix == "-" ? " | " : " - ")}`
            }
        } else {
            let perms: Perm[] = client.db.load("perms", { channelId: msg.channelId }).perms;

            if (cmd) {
                let customPerm = perms?.find(p => p.cmd == cmd.info.name);

                str = `${sets.prefix ?? client.config.prefix}${cmd.info.name}: ${sets.prefix ? cmd.info.description.replace(client.config.prefix, sets.prefix) : cmd.info.description} | args: ${cmd.info.args ? `${sets.prefix ?? client.config.prefix}${cmd.info.name} ${cmd.info.args}` : "none"} | aliases: ${cmd.config.aliases?.join(", ") || "none"} | required perm: ${PermLevels[customPerm?.perm || cmd.config.permLevel]}`;
            } else {
                str = `${sets.prefix ?? client.config.prefix}help <command> for more info | ${client.commands.values().filter(c => (perms?.find(p => p.cmd == c.info.name)?.perm || c.config.permLevel) <= opts.userPerms).map(c => `${sets.prefix ?? client.config.prefix}${c.info.name}`).toArray().join(sets.prefix == "-" ? " | " : " - ")}`;
            }
        }

        await client.say(channel, str, { replyTo: msg });
    }
}
