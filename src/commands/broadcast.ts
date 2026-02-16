import Gdreqbot from "../modules/Bot";
import BaseCommand from "../structs/BaseCommand";
import { ChatMessage } from "@twurple/chat";
import PermLevels from "../structs/PermLevels";
import { Session } from "../datasets/session";

export = class BroadcastCommand extends BaseCommand {
    constructor() {
        super({
            name: "broadcast",
            description: "Broadcast to active sessions",
            enabled: true,
            permLevel: PermLevels.DEV
        });
    }

    async run(client: Gdreqbot, msg: ChatMessage, channel: string, args: string[]): Promise<any> {
        if (!args?.length) return;

        let sessions: Session[] = client.db.load("session", {}, true);
        let active = sessions?.filter(s => s.active);

        if (!active?.length) return client.say(channel, "No active sessions");

        for (let i = 0; i < active.length; i++)
            client.say(active[i].userName, args.join(" "));
    }
}
