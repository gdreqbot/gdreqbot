import Gdreqbot from "../core";
import BaseCommand from "../structs/BaseCommand";
import { ChatMessage } from "@twurple/chat";
import PermLevels from "../structs/PermLevels";

export = class PrivilegeCommand extends BaseCommand {
    constructor() {
        super({
            name: "privilege",
            description: "Run a command in privilege mode for those supporting it (type !pr help <command> for info)",
            args: "<command>",
            aliases: ["pr", "prm", "prmode"],
            enabled: true,
            permLevel: PermLevels.MOD
        });
    }

    async run(client: Gdreqbot, msg: ChatMessage, channel: string, args: string[], userPerms: PermLevels): Promise<any> {
        if (!args.length)
            return client.say(channel, "Specify a command to run in privilege mode.", { replyTo: msg });

        let newArgs = args.join(" ").trim().split(/ +/);
        let cmdName = newArgs.shift().toLowerCase();

        let cmd = client.commands.get(cmdName)
            || client.commands.values().find(c => c.config.aliases?.includes(cmdName));

        if (!cmd || !cmd.config.enabled || cmd.config.permLevel > userPerms) return;
        if (!cmd.config.supportsPrivilege)
            return client.say(channel, "This command doesn't support privilege mode.", { replyTo: msg });

        try {
            client.logger.log(`Running command: ${cmd.config.name} in channel: ${channel} in privilege mode`);
            await cmd.run(client, msg, channel, newArgs, userPerms, true);
        } catch (e) {
            client.say(channel, `An error occurred running command: ${cmd.config.name}. If the issue persists, please contact the developer.`, { replyTo: msg });
            console.error(e);
        }
    }
}
