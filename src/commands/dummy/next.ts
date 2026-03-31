import BaseCommand from "../../structs/BaseCommand";
import PermLevels from "../../structs/PermLevels";

export = class NextCommand extends BaseCommand {
    constructor() {
        super({
            name: "next",
            description: "Shifts the queue",
            category: "requests",
            aliases: ["n", "skip"],
            enabled: true,
            permLevel: PermLevels.MOD,
            supportsSilent: true,
        });
    }
}
