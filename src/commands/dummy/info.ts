import BaseCommand from "../../structs/BaseCommand";

export = class InfoCommand extends BaseCommand {
    constructor() {
        super({
            name: "info",
            description: "Get info for a level in the queue",
            category: "requests",
            args: "[<query>]",
            aliases: ["i", "get", "g"],
            enabled: true
        });
    }
}
