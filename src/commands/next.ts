import { ChatMessage } from "@twurple/chat";
import Gdreqbot, { updatedb } from "../core";
import { ResCode } from "../modules/Request";
import BaseCommand from "../structs/BaseCommand";
import PermLevels from "../structs/PermLevels";
import { User } from "../structs/user";

export = class NextCommand extends BaseCommand {
    constructor() {
        super({
            name: "next",
            description: "Shifts the queue",
            category: "requests",
            aliases: ["n", "skip"],
            enabled: true,
            permLevel: PermLevels.MOD,
            supportsSilent: true,
        });
    }

    async run(client: Gdreqbot, msg: ChatMessage, channel: string, args: string[], opts: { auto: boolean, silent: boolean }): Promise<any> {
        let replyTo = opts.auto ? null : msg;

        if (!opts.auto) {
            let updateUsers: User[] = updatedb.get("updateUsers");
            let updateUser: User = updateUsers.find((u: User) => u.userId == msg.userInfo.userId);
            if (!updateUser) {
                await client.say(channel, `Hey! There is a requests dashboard now: ${process.env.URL}/dashboard || You can still use commands if you wish (this message won't appear anymore)`, { replyTo });
                updateUsers.push({ userId: msg.channelId, userName: channel });
                await updatedb.set("updateUsers", updateUsers);
                return;
            }
        }

        let res = await client.req.next(client, msg.channelId);

        switch (res.status) {
            case ResCode.EMPTY: {
                if (!opts.silent && !opts.auto) client.say(channel, "Kappa The queue is empty.", { replyTo });
                break;
            }

            case ResCode.ERROR: {
                client.say(channel, "An error occurred.", { replyTo });
                break;
            }

            case ResCode.OK: {
                if (!opts.silent) client.say(channel, `PogChamp Next ${res.random ? "random " : ""}level: '${res.level.name}' (${res.level.id}) by ${res.level.creator}`, { replyTo });
                break;
            }
        }
    }
}
