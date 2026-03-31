import BaseCommand from "../../structs/BaseCommand";
import PermLevels from "../../structs/PermLevels";

export = class ClearCommand extends BaseCommand {
    constructor() {
        super({
            name: "clear",
            description: "Clear the queue",
            category: "requests",
            aliases: ["purge"],
            enabled: true,
            permLevel: PermLevels.MOD,
            supportsSilent: true
        });
    }
}
