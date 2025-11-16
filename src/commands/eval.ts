import Gdreqbot from "../core";
import BaseCommand from "../structs/BaseCommand";
import { ChatMessage } from "@twurple/chat";
import PermLevels from "../structs/PermLevels";
import { inspect } from "util";

export = class EvalCommand extends BaseCommand {
    constructor() {
        super({
            name: "eval",
            description: "Evaluates arbitrary JavaScript",
            enabled: true,
            permLevel: PermLevels.DEV
        });
    }

    async run(client: Gdreqbot, msg: ChatMessage, channel: string, args: string[]): Promise<any> {
        try {
            let result = await eval(args.join(" "));
            if (typeof result !== "string")
                result = inspect(result, { depth: 0 });

            if (result.length > 500) {
                client.logger.log(result);
                result = "Result exceeds character limit (check the console)";
            }

            await client.say(channel, result, { replyTo: msg });
        } catch (err) {
            client.logger.error("Eval", err);
            await client.say(channel, err, { replyTo: msg });
        }
    }
}
