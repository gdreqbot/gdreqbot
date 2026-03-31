import BaseCommand from "../../structs/BaseCommand";

export = class RemoveCommand extends BaseCommand {
    constructor() {
        super({
            name: "remove",
            description: "Remove your last level from the queue",
            category: "requests",
            privilegeDesc: "Remove the overall last level from the queue, or a specific one",
            privilegeArgs: "[<query>]",
            aliases: ["rm", "oops"],
            enabled: true,
            supportsPrivilege: true,
            supportsSilent: true,
        });
    }
}
