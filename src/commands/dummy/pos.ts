import BaseCommand from "../../structs/BaseCommand";

export = class PosCommand extends BaseCommand {
    constructor() {
        super({
            name: "pos",
            description: "Get your level's position in the queue, or a specific one",
            category: "requests",
            args: "[<query>]",
            aliases: ["p", "position"],
            enabled: true
        });
    }
}
