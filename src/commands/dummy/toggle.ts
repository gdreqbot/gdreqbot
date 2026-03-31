import BaseCommand from "../../structs/BaseCommand";
import PermLevels from "../../structs/PermLevels";

export = class ToggleCommand extends BaseCommand {
    constructor() {
        super({
            name: "toggle",
            description: "Toggle requests",
            category: "requests",
            aliases: ["t"],
            enabled: true,
            permLevel: PermLevels.MOD,
            supportsSilent: true
        });
    }
}
