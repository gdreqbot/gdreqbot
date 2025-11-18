import Gdreqbot from "../core";
import BaseCommand from "../structs/BaseCommand";
import { ChatMessage } from "@twurple/chat";
import PermLevels from "../structs/PermLevels";
import { Blacklist } from "../datasets/blacklist";
import * as twitch from "../apis/twitch";
import { User } from "../structs/user";

export = class BlacklistCommand extends BaseCommand {
    constructor() {
        super({
            name: "blacklist",
            description: "Manage blacklisted users (prevented from using the bot)",
            args: "add|remove|clear [<user>]",
            aliases: ["bl"],
            enabled: true,
            permLevel: PermLevels.MOD
        });
    }

    async run(client: Gdreqbot, msg: ChatMessage, channel: string, args: string[], userPerms: PermLevels): Promise<any> {
        let blacklist: Blacklist = client.db.load("blacklist", { channelId: msg.channelId });

        if (!args.length || (!["add", "remove", "clear"].includes(args[0]))) return client.say(channel, "You must select a valid action (add|remove|clear)", { replyTo: msg });
        if (!args[1] && args[0] != "clear") return client.say(channel, "You must specify a user.", { replyTo: msg });

        switch (args[0]) {
            case "add": {
                let userName = args[1].replace(/\s*@\s*/g, '').toLowerCase();
                let rawUser = await twitch.getUser(userName, "login");

                if (!rawUser) return client.say(channel, "An error occurred fetching user data. Please try again.", { replyTo: msg });
                else if (!rawUser.data.length) return client.say(channel, "That user doesn't exist.", { replyTo: msg });

                let user: User = {
                    userId: rawUser.data[0].id,
                    userName: rawUser.data[0].login
                };

                if (blacklist.users.some(u => u.userId == user.userId)) return client.say(channel, "That user is already blacklisted.", { replyTo: msg });

                blacklist.users.push(user);
                await client.db.save("blacklist", { channelId: msg.channelId }, { users: blacklist.users });

                client.say(channel, `Added ${userName} to the blacklist.`, { replyTo: msg });
                break;
            }

            case "remove": {
                let userName = args[1].replace(/\s*@\s*/g, '').toLowerCase();
                let rawUser = await twitch.getUser(userName, "login");

                if (!rawUser) return client.say(channel, "An error occurred fetching user data. Please try again.", { replyTo: msg });
                else if (!rawUser.data.length) return client.say(channel, "That user doesn't exist.", { replyTo: msg });

                let idx = blacklist.users.findIndex(u => u.userId == rawUser.data[0].id);
                if (idx == -1) return client.say(channel, "That user isn't blacklisted.", { replyTo: msg });

                blacklist.users.splice(idx, 1);
                await client.db.save("blacklist", { channelId: msg.channelId }, { users: blacklist.users });

                client.say(channel, `Removed ${userName} from the blacklist.`, { replyTo: msg });
                break;
            }

            case "clear": {
                await client.db.save("blacklist", { channelId: msg.channelId }, { users: [] });

                client.say(channel, "Cleared the blacklist.", { replyTo: msg });
                break;
            }
        }
    }
}
