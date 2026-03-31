import BaseCommand from "../../structs/BaseCommand";
import PermLevels from "../../structs/PermLevels";

export = class SilentCommand extends BaseCommand {
    constructor() {
        super({
            name: "silent",
            description: "Toggle silent mode",
            category: "requests",
            aliases: ["silent-mode", "silentmode", "togglesilent", "togglesilentmode"],
            enabled: true,
            permLevel: PermLevels.MOD,
            supportsSilent: true
        });
    }
}
