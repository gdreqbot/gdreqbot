import { writeFile } from "fs/promises";
import Gdreqbot from "../core";
import BaseCommand from "../structs/BaseCommand";
import { ChatMessage } from "@twurple/chat";
import PermLevels from "../structs/PermLevels";

export = class RebootCommand extends BaseCommand {
    constructor() {
        super({
            name: "reboot",
            description: "Reboots the bot",
            enabled: true,
            permLevel: PermLevels.DEV
        });
    }

    async run(client: Gdreqbot, msg: ChatMessage, channel: string): Promise<any> {
        await client.say(channel, "Rebooting...", { replyTo: msg });

        await writeFile("./reboot.json", `{"channel": "${channel}", "timestamp": "${Date.now()}"}`);
        client.logger.reboot();
        process.exit();
    }
}
