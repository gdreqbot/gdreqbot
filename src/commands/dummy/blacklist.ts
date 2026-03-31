import BaseCommand from "../../structs/BaseCommand";
import PermLevels from "../../structs/PermLevels";

export = class BlacklistCommand extends BaseCommand {
    constructor() {
        super({
            name: "blacklist",
            description: "Manage blacklisted users or levels",
            args: "user|level add|remove|list|clear [<arg>]",
            aliases: ["bl", "blist"],
            enabled: true,
            permLevel: PermLevels.MOD
        });
    }
}
