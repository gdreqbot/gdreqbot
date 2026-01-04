import Gdreqbot from "../core";
import BaseCommand from "../structs/BaseCommand";
import { ChatMessage } from "@twurple/chat";
import PermLevels from "../structs/PermLevels";

export = class GlobalBlCommand extends BaseCommand {
    constructor() {
        super({
            name: "global-bl",
            description: "Manage the global level blacklist",
            aliases: ["gbl", "global-blacklist"],
            enabled: true,
            permLevel: PermLevels.DEV
        });
    }

    async run(client: Gdreqbot, msg: ChatMessage, channel: string, args: string[]): Promise<any> {
        let bl: string[] = client.blacklist.get("blacklist");
        let str: string;

        switch (args[0]) {
            case "add":
                bl?.length ? bl.push(args[1]) : bl = [args[1]];
                str = "Added";
                break;

            case "remove":
                bl?.length ? bl.splice(bl.indexOf(args[1]), 1) : bl = [];
                str = "Removed";
                break;

            case "clear":
                bl = [];
                str = "Cleared";
        }

        await client.blacklist.set("blacklist", bl);
        client.say(channel, `${str} ${args[1] || ""}`);
    }
}
