import Gdreqbot from "../modules/Bot";
import BaseCommand from "../structs/BaseCommand";
import { ChatMessage } from "@twurple/chat";
import PermLevels from "../structs/PermLevels";
import { Session } from "../datasets/session";

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
        if (!["users", "levels"].includes(args[0])) return;

        let str: string;

        switch (args[1]) {
            case "add":
                await client.blacklist.add(args[2], args[0] as "users" | "levels");

                let session: Session = client.db.load("session", { userId: args[2] });
                if (session) await client.db.delete("session", { userId: args[0] });

                str = "Added";
                break;

            case "remove":
                await client.blacklist.remove(args[2], args[0] as "users" | "levels");
                str = "Removed";
                break;

            case "clear":
                await client.blacklist.clear(args[0] as "users" | "levels");
                str = "Cleared";
        }

        client.say(channel, `${str} ${args[2] || ""}`);
    }
}
