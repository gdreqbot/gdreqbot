import BaseCommand from "../../structs/BaseCommand";

export = class ReqCommand extends BaseCommand {
    constructor() {
        super({
            name: "req",
            description: "Request a level by name or ID",
            category: "requests",
            args: "<query> [<notes>]",
            aliases: ["r", "request", "add", "join"],
            enabled: true,
            supportsSilent: true
        });
    }
}
