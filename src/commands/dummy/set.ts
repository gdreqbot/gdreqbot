import BaseCommand from "../../structs/BaseCommand";
import PermLevels from "../../structs/PermLevels";

export = class SetCommand extends BaseCommand {
    constructor() {
        super({
            name: "set",
            description: "View or edit settings",
            args: "[<setting> <value>] (for numeric options, -1 disables it)",
            aliases: ["s", "settings"],
            enabled: true,
            permLevel: PermLevels.MOD
        });
    }
}
