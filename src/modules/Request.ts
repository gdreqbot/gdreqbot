import Gdreqbot from "../core";
import { LevelData } from "../datasets/levels";
import { User } from "../structs/user";
import { Settings } from "../datasets/settings";
import * as gd from "../apis/gd";

class Request {
    parseLevel(raw: string, user?: User): LevelData {
        return {
            name: raw.split(":")[3],
            creator: raw.split("#")[1].split(":")[1],
            id: raw.split(":")[1],
            user: user ?? null
        };
    }

    async addLevel(client: Gdreqbot, channelId: string, user: User, query: string) {
        let sets: Settings = client.db.load("settings", { channelId });
        let blacklisted: LevelData[] = client.db.load("blacklist", { channelId })?.levels;
        let bl: string[] = client.blacklist.get("levels");
        if (!sets.req_enabled) return { status: ResCode.DISABLED };

        try {
            let raw = await gd.getLevel(query);
            // console.log(raw);
            if (!raw) return { status: ResCode.ERROR };
            else if (raw == "-1") return { status: ResCode.NOT_FOUND };

            let newLvl = this.parseLevel(raw, user);
            if (bl?.length && bl.includes(newLvl.id))
                return { status: ResCode.GLOBAL_BL };
            else if (blacklisted?.find(l => l.id == newLvl.id))
                return { status: ResCode.BLACKLISTED };

            let levels: LevelData[] = client.db.load("levels", { channelId }).levels;

            if (levels.find(l => l.id == newLvl.id))
                return { status: ResCode.ALREADY_ADDED };
            else if (sets.max_levels_per_user != -1 && levels.filter(l => l.user.userId == user.userId).length >= sets.max_levels_per_user)
                return { status: ResCode.MAX_PER_USER };
            else if (sets.max_queue_size != -1 && levels.length >= sets.max_queue_size)
                return { status: ResCode.FULL };

            levels.push(newLvl);
            await client.db.save("levels", { channelId }, { levels });

            return { status: ResCode.OK, level: newLvl };
        } catch (e) {
            console.error(e);
            return { status: ResCode.ERROR };
        }
    }

    async removeLevel(client: Gdreqbot, channelId: string, query: string) {
        let levels: LevelData[] = client.db.load("levels", { channelId }).levels;
        if (!levels.length)
            return { status: ResCode.EMPTY };

        let pos = levels.findIndex(l => l.id == query || l.name.toLowerCase() == query.toLowerCase());
        if (pos == -1)
            return { status: ResCode.NOT_FOUND };

        let level = levels.splice(pos, 1);

        try {
            await client.db.save("levels", { channelId }, { levels });
        } catch (e) {
            console.error(e);
            return { status: ResCode.ERROR };
        }

        return { status: ResCode.OK, level };
    }

    getLevel(client: Gdreqbot, channelId: string, query?: string) {
        let levels: LevelData[] = client.db.load("levels", { channelId }).levels;
        if (!levels.length)
            return { status: ResCode.EMPTY };

        let level;
        if (query) {
            level = levels.find(l => l.id == query)
                || levels.find(l => l.name.toLowerCase() == query.toLowerCase());

            if (!level)
                return { status: ResCode.NOT_FOUND };
        } else {
            level = levels[0];
        }

        let pos = levels.findIndex(l => l.id == query || l.name.toLowerCase() == query.toLowerCase());
        return { status: ResCode.OK, level, pos };
    }

    async swapLevels(client: Gdreqbot, channelId: string, query1: string, query2: string) {
        let levels: LevelData[] = client.db.load("levels", { channelId }).levels;
        if (!levels.length)
            return { status: ResCode.EMPTY };

        let level1 = this.getLevel(client, channelId, query1);
        if (level1.status == ResCode.NOT_FOUND)
            return { status: ResCode.NOT_FOUND, query: 0 };
        
        let level2 = this.getLevel(client, channelId, query2);
        if (level2.status == ResCode.NOT_FOUND)
            return { status: ResCode.NOT_FOUND, query: 1 };

        let temp = level1;
        levels[level2.pos] = level1.level;
        levels[temp.pos] = level2.level;

        await client.db.save("levels", { channelId }, { levels });
        return { status: ResCode.OK, levels: [level1, level2] };
    }

    async clear(client: Gdreqbot, channelId: string) {
        let levels: LevelData[] = client.db.load("levels", { channelId }).levels;
        if (!levels.length)
            return { status: ResCode.EMPTY };

        await client.db.save("levels", { channelId }, { levels: [] });
        return { status: ResCode.OK };
    }

    async next(client: Gdreqbot, channelId: string) {
        let levels: LevelData[] = client.db.load("levels", { channelId }).levels;
        let sets: Settings = client.db.load("settings", { channelId });

        if (!levels.length)
            return { status: ResCode.EMPTY };

        try {
            if (sets.random_queue) {
                let idx = Math.floor(Math.random() * levels.length);
                await this.swapLevels(client, channelId, levels[0].id, levels[idx].id);

                levels = client.db.load("levels", { channelId }).levels;
                levels.splice(idx, 1);
            } else {
                levels.shift();
            }

            await client.db.save("levels", { channelId }, { levels });
        } catch (e) {
            console.error(e);
            return { status: ResCode.ERROR };
        }

        let level: LevelData = client.db.load("levels", { channelId }).levels[0];
        if (!level)
            return { status: ResCode.EMPTY };

        return { status: ResCode.OK, level, random: sets.random_queue };
    }

    list(client: Gdreqbot, channelId: string, page?: number) {
        let levels: LevelData[] = client.db.load("levels", { channelId }).levels;
        if (!levels.length)
            return { status: ResCode.EMPTY };

        let pages = [];
        let done = false;
        let start = 0;
        let end = levels.length >= 10 ? 10 : levels.length;
        let pos = 0;

        while (!done) {
            let list = levels.slice(start, end);
            if (!list.length) {
                done = true;
                break;
            }

            pages.push(list.map(l => {
                pos++;
                return {
                    name: l.name,
                    id: l.id,
                    pos
                }
            }));

            start += 10;
            end += levels.length > start ? 10 : 0;

            if (start > end) done = true;
        }

        if (page > pages.length)
            return { status: ResCode.END };

        return { status: ResCode.OK, page: pages[page ? page-1 : 0], pages: pages.length };
    }

    async toggle(client: Gdreqbot, channelId: string) {
        let sets: Settings = client.db.load("settings", { channelId });
        await client.db.save("settings", { channelId }, { req_enabled: !sets.req_enabled });

        return !sets.req_enabled;
    }

    async toggleRandom(client: Gdreqbot, channelId: string) {
        let sets: Settings = client.db.load("settings", { channelId });
        await client.db.save("settings", { channelId }, { random_queue: !sets.random_queue });

        return !sets.random_queue;
    }

    async set(client: Gdreqbot, channelId: string, key: string, value: string) {
        let sets: Settings = client.db.load("settings", { channelId });

        // ugly as hell ik
        switch (key) {
            case "req_enabled": {
                if (value != "true" && value != "false")
                    return { status: ResCode.INVALID_VALUE };

                sets.req_enabled = (value == "true" ? true : false);
                break;
            }

            case "prefix": {
                if (!value)
                    return { status: ResCode.INVALID_VALUE };

                sets.prefix = value;
                break;
            }

            case "max_levels_per_user": {
                let n = parseInt(value);

                if (isNaN(n))
                    return { status: ResCode.INVALID_VALUE };
                else if (n < -1 || n == 0)
                    return { status: ResCode.INVALID_RANGE };

                sets.max_levels_per_user = n;
                break;
            }

            case "max_queue_size": {
                let n = parseInt(value);

                if (isNaN(n))
                    return { status: ResCode.INVALID_VALUE };
                else if (n < -1 || n == 0)
                    return { status: ResCode.INVALID_RANGE };

                sets.max_queue_size = n;
                break;
            }

            default:
                return { status: ResCode.INVALID_KEY };
        }

        await client.db.save("settings", { channelId }, sets);
        return { status: ResCode.OK };
    }
}

export default Request;

export enum ResCode {
    OK,
    NOT_FOUND,
    MAX_PER_USER,
    ALREADY_ADDED,
    DISABLED,
    EMPTY,
    FULL,
    INVALID_KEY,
    INVALID_VALUE,
    INVALID_RANGE,
    END,
    BLACKLISTED,
    GLOBAL_BL,
    ERROR
}
