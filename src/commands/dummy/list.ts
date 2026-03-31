import BaseCommand from "../../structs/BaseCommand";

export = class ListCommand extends BaseCommand {
    constructor() {
        super({
            name: "list",
            description: "Lists levels in the queue",
            category: "requests",
            args: "[<page>]",
            aliases: ["l", "q", "queue"],
            enabled: true
        });
    }
}
