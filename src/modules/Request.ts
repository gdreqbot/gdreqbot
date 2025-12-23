import Gdreqbot from "../core";
import superagent from "superagent";
import { LevelData } from "../datasets/levels";
import { User } from "../structs/user";
import { Settings } from "../datasets/settings";
import * as gd from "../apis/gd";

class Request {
    private parseLevel(raw: string, user: User): LevelData {
        return {
            name: raw.split(":")[3],
            creator: raw.split("#")[1].split(":")[1],
            id: raw.split(":")[1],
            user
        };
    }

    async addLevel(client: Gdreqbot, channelId: string, user: User, query: string) {
        let sets: Settings = client.db.load("settings", { channelId });
        if (!sets.req_enabled) return { status: ResCode.DISABLED };

        try {
            let raw = await gd.getLevel(query);
            // console.log(raw);
            if (!raw) return { status: ResCode.ERROR };
            else if (raw == "-1") return { status: ResCode.NOT_FOUND };

            let newLvl = this.parseLevel(raw, user);
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
        return { status: ResCode.OK, level, lvlPos: pos+1 };
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
        if (!levels.length)
            return { status: ResCode.EMPTY };

        try {
            levels.shift();
            await client.db.save("levels", { channelId }, { levels });
        } catch (e) {
            console.error(e);
            return { status: ResCode.ERROR };
        }

        let level: LevelData = client.db.load("levels", { channelId }).levels[0];
        if (!level)
            return { status: ResCode.EMPTY };

        return { status: ResCode.OK, level };
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
    ERROR
}
