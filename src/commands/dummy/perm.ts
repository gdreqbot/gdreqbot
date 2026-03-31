import BaseCommand from "../../structs/BaseCommand";
import PermLevels from "../../structs/PermLevels";

export = class PermCommand extends BaseCommand {
    constructor() {
        super({
            name: "perm",
            description: "View your permission level",
            privilegeDesc: "Set required perms for a command",
            privilegeArgs: "set|reset <command> [<perm>]",
            aliases: ["permission", "permissions"],
            enabled: true,
            permLevel: PermLevels.BLACKLISTED,
            supportsPrivilege: true
        });
    }
}
