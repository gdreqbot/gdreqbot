import BaseCommand from "../../structs/BaseCommand";
import PermLevels from "../../structs/PermLevels";

export = class PrivilegeCommand extends BaseCommand {
    constructor() {
        super({
            name: "privilege",
            description: "Run a command in privilege mode for those supporting it (type !pr help <command> for info)",
            args: "<command>",
            aliases: ["pr", "prm", "prmode"],
            enabled: true,
            permLevel: PermLevels.MOD,
            supportsSilent: true
        });
    }
}
