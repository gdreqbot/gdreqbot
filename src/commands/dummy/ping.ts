import BaseCommand from "../../structs/BaseCommand";

export = class PingCommand extends BaseCommand {
    constructor() {
        super({
            name: "ping",
            description: "Gives the bot latency",
            privilegeDesc: "Gives the privileged bot latency",
            enabled: true,
            supportsPrivilege: true
        });
    }
}
