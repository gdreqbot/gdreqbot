import Gdreqbot from "../core";
import BaseCommand from "../structs/BaseCommand";
import { ChatMessage } from "@twurple/chat";
import PermLevels from "../structs/PermLevels";
import { Blacklist } from "../datasets/blacklist";
import { getUser } from "../apis/twitch";
import { getLevel } from "../apis/gd";

export = class BlacklistCommand extends BaseCommand {
    constructor() {
        super({
            name: "blacklist",
            description: "Manage blacklisted users or levels",
            args: "user|level add|remove|list|clear [<arg>]",
            aliases: ["bl", "blist"],
            enabled: true,
            permLevel: PermLevels.MOD
        });
    }

    async run(client: Gdreqbot, msg: ChatMessage, channel: string, args: string[]): Promise<any> {
        let blacklist: Blacklist = client.db.load("blacklist", { channelId: msg.channelId });

        if (!args.length || (!["user", "level"].includes(args[0]))) return client.say(channel, "Select a valid blacklist (user or level)", { replyTo: msg });
        if (!["add", "remove", "clear", "list"].includes(args[1])) return client.say(channel, "Select a valid action (add|remove|list|clear)", { replyTo: msg });
        if (!args[2] && (!["clear", "list"].includes(args[1]))) return client.say(channel, `Specify a ${args[0]}.`, { replyTo: msg });

        switch (args[1]) {
            case "add": {
                let query = args[0] == "user" ? args[2].replace(/\s*@\s*/g, '').toLowerCase() : args[2];
                let rawData = args[0] == "user" ? await getUser(query, "login") : await getLevel(query);

                if (!rawData) return client.say(channel, `An error occurred fetching ${args[0]} data. Please try again.`, { replyTo: msg });
                else if (args[0] == "user" ? !rawData.data.length : rawData == "-1") return client.say(channel, `That ${args[0]} doesn't exist.`, { replyTo: msg });

                let data: any;
                let str: string;
                if (args[0] == "user") {
                    data = {
                        userId: rawData.data[0].id,
                        userName: rawData.data[0].login
                    };
                    if (blacklist.users.some(u => u.userId == data.userId)) return client.say(channel, "That user is already blacklisted.", { replyTo: msg });

                    blacklist.users.push(data);
                    str = data.userName;
                } else {
                    data = client.req.parseLevel(rawData);
                    if (blacklist.levels?.some(l => l.id == data.id)) return client.say(channel, "That level is already blacklisted.", { replyTo: msg });

                    blacklist.levels ? blacklist.levels.push(data) : blacklist.levels = [data];
                    str = `'${data.name}' (${data.id}) by ${data.creator}`;
                }

                await client.db.save("blacklist", { channelId: msg.channelId }, blacklist);
                client.say(channel, `Added ${str} to the ${args[0]} blacklist.`, { replyTo: msg });
                break;
            }

            case "remove": {
                let query = args[0] == "user" ? args[2].replace(/\s*@\s*/g, '').toLowerCase() : args[2];
                let rawData = args[0] == "user" ? await getUser(query, "login") : await getLevel(query);

                if (!rawData) return client.say(channel, `An error occurred fetching ${args[0]} data. Please try again.`, { replyTo: msg });
                else if (args[0] == "user" ? !rawData.data.length : rawData == "-1") return client.say(channel, `That ${args[0]} doesn't exist.`, { replyTo: msg });

                let idx: number;
                let data: any;
                let str: string;

                if (args[0] == "user") {
                    data = {
                        userId: rawData.data[0].id,
                        userName: rawData.data[0].login
                    };

                    idx = blacklist.users.findIndex(u => u.userId == data.userId);
                    if (idx == -1) return client.say(channel, "That user isn't blacklisted.", { replyTo: msg });

                    blacklist.users.splice(idx, 1);
                    str = data.userName;
                } else {
                    data = client.req.parseLevel(rawData);

                    idx = blacklist.levels?.findIndex(l => l.id == data.id);
                    if (idx == -1) return client.say(channel, "That level isn't blacklisted.", { replyTo: msg });

                    blacklist.levels.splice(idx, 1);
                    str = `'${data.name}' (${data.id}) by ${data.creator}`;
                }

                await client.db.save("blacklist", { channelId: msg.channelId }, blacklist);
                client.say(channel, `Removed ${str} from the ${args[0]} blacklist.`, { replyTo: msg });
                break;
            }

            case "clear": {
                await client.db.save("blacklist", { channelId: msg.channelId }, args[0] == "user" ? { users: [] } : { levels: [] });

                client.say(channel, `Cleared the ${args[0]} blacklist.`, { replyTo: msg });
                break;
            }

            case "list": {
                let page = parseInt(args[2]);
                if (args[2] && isNaN(page))
                    return client.say(channel, "Kappa Sir that's not a number.", { replyTo: msg });

                let bl = args[0] == "user" ? blacklist.users : blacklist.levels;

                if (!bl?.length) return client.say(channel, `The ${args[0]} blacklist is empty.`, { replyTo: msg });

                let pages = [];
                let done = false;
                let start = 0;
                let end = bl.length >= 10 ? 10 : bl.length;
                let pos = 0;

                while (!done) {
                    let list = bl.slice(start, end);
                    if (!list.length) {
                        done = true;
                        break;
                    }

                    pages.push(list.map((l: any) => {
                        pos++;
                        return args[0] == "user" ? l.userName : `'${l.name}' (${l.id})`;
                    }));

                    start += 10;
                    end += blacklist.users.length > start ? 10 : 0;

                    if (start > end) done = true;
                }

                if (page > pages.length)
                    return client.say(channel, "Kappa There aren't that many pages.", { replyTo: msg });

                client.say(channel, `Page ${page || "1"} of ${pages.length} (${bl.length} ${args[0]}s) | ${pages[page ? page-1 : 0].join(" - ")}`, { replyTo: msg });
                break;
            }
        }
    }
}
