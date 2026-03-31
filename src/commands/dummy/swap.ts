import BaseCommand from "../../structs/BaseCommand";
import PermLevels from "../../structs/PermLevels";

export = class SwapCommand extends BaseCommand {
    constructor() {
        super({
            name: "swap",
            description: "Swap the position of two levels in the queue",
            category: "requests",
            args: "\"<level1>\" \"<level2>\"",
            aliases: ["sw", "switch"],
            enabled: true,
            permLevel: PermLevels.MOD
        });
    }
}
