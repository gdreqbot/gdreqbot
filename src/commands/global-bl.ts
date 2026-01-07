import Gdreqbot from "../core";
import BaseCommand from "../structs/BaseCommand";
import { ChatMessage } from "@twurple/chat";
import PermLevels from "../structs/PermLevels";

export = class GlobalBlCommand extends BaseCommand {
    constructor() {
        super({
            name: "global-bl",
            description: "Manage the global blacklist",
            aliases: ["gbl", "global-blacklist"],
            enabled: true,
            permLevel: PermLevels.DEV
        });
    }

    async run(client: Gdreqbot, msg: ChatMessage, channel: string, args: string[]): Promise<any> {
        let bl: string[];

        if (args[0] == "users")
            bl = client.blacklist.get("users");
        else if (args[0] == "levels")
            bl = client.blacklist.get("levels");
        else return;

        let str: string;

        switch (args[1]) {
            case "add":
                bl?.length ? bl.push(args[2]) : bl = [args[2]];
                str = "Added";
                break;

            case "remove":
                bl?.length ? bl.splice(bl.indexOf(args[2]), 2) : bl = [];
                str = "Removed";
                break;

            case "clear":
                bl = [];
                str = "Cleared";
        }

        await client.blacklist.set(args[0], bl);
        client.say(channel, `${str} ${args[2] || ""}`);
    }
}
