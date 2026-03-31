import BaseCommand from "../../structs/BaseCommand";
import PermLevels from "../../structs/PermLevels";

export = class RandomCommand extends BaseCommand {
    constructor() {
        super({
            name: "random",
            description: "Toggle the random queue",
            category: "requests",
            aliases: ["rndm", "togglerandom", "randomqueue", "randomq", "rndmq"],
            enabled: true,
            permLevel: PermLevels.MOD,
            supportsSilent: true
        });
    }
}
