import BaseCommand from "../../structs/BaseCommand";

export = class PartCommand extends BaseCommand {
    constructor() {
        super({
            name: "invite",
            description: "Invite gdreqbot to your stream chat!",
            enabled: true
        });
    }
}
