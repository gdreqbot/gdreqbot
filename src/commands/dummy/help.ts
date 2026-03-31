import BaseCommand from "../../structs/BaseCommand";

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
}
