import MapDB from "@galaxy05/map.db";
import Gdreqbot from "../core";
import superagent from "superagent";

class Request {
    //query: string;
    //type?: "id" | "name";

    //constructor(query: string, type: "id" | "name" = "id") {
    //    this.query = query;
    //    this.type = type;
    //}

    constructor(db: MapDB) {
        let levels: LevelData[] = db.get("levels");
        if (!levels?.length) {
            db.set("levels", []);
        }

        let sets: Settings = db.get("settings");
        if (!sets) {
            db.set("settings", {
                req_enabled: true,
                max_per_user: 2,
                max_queue: -1
            } as Settings);
        }
    }

    private parseLevel(raw: string, user: string): LevelData {
        return {
            name: raw.split(":")[3],
            creator: raw.split("#")[1].split(":")[1],
            id: raw.split(":")[1],
            user
        };
    }

    async addLevel(client: Gdreqbot, query: string, user: string) {
        let sets: Settings = client.db.get("settings");
        if (!sets.req_enabled) return { status: ResCode.DISABLED };

        try {
            let res = await superagent
                .post("http://www.boomlings.com/database/getGJLevels21.php")
                .set("Content-Type", "application/x-www-form-urlencoded")
                .set("User-Agent", "")
                .send({
                    "str": query,
                    "type": 0,
                    "secret": "Wmfd2893gb7",
                });
            console.log(res.text);
            if (res.text == "-1") return { status: ResCode.NOT_FOUND };

            let newLvl = this.parseLevel(res.text, user);
            let levels: LevelData[] = client.db.get("levels");

            if (levels.find(l => l.id == newLvl.id))
                return { status: ResCode.ALREADY_ADDED };
            else if (sets.max_per_user != -1 && levels.filter(l => l.user == user).length >= sets.max_per_user)
                return { status: ResCode.MAX_PER_USER };
            else if (sets.max_queue != -1 && levels.length >= sets.max_queue)
                return { status: ResCode.FULL };

            levels.push(newLvl);
            await client.db.set("levels", levels);

            return { status: ResCode.OK, level: newLvl };
        } catch (e) {
            console.error(e);
            return { status: ResCode.ERROR };
        }
    }

    async removeLevel(client: Gdreqbot, query: string) {
        let levels: LevelData[] = client.db.get("levels");
        if (!levels.length)
            return { status: ResCode.EMPTY };

        let pos = levels.findIndex(l => l.id == query || l.name.toLowerCase() == query.toLowerCase());
        if (pos == -1)
            return { status: ResCode.NOT_FOUND };

        let level = levels.splice(pos, 1);

        try {
            await client.db.set("levels", levels);
        } catch (e) {
            console.error(e);
            return { status: ResCode.ERROR };
        }

        return { status: ResCode.OK, level };
    }

    getLevel(client: Gdreqbot, query?: string) {
        let levels: LevelData[] = client.db.get("levels");
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

    async clear(client: Gdreqbot) {
        let levels: LevelData[] = client.db.get("levels");
        if (!levels.length)
            return { status: ResCode.EMPTY };
        
        await client.db.set("levels", []);
        return { status: ResCode.OK };
    }

    async next(client: Gdreqbot) {
        let levels: LevelData[] = client.db.get("levels");
        if (!levels.length)
            return { status: ResCode.EMPTY };

        try {
            levels.shift();
            await client.db.set("levels", levels);
        } catch (e) {
            console.error(e);
            return { status: ResCode.ERROR };
        }

        let level: LevelData = client.db.get("levels")[0];
        if (!level)
            return { status: ResCode.EMPTY };

        return { status: ResCode.OK, level };
    }

    list(client: Gdreqbot, page?: number) {
        let levels: LevelData[] = client.db.get("levels");
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

    async toggle(client: Gdreqbot) {
        let sets: Settings = client.db.get("settings");
        sets.req_enabled = !sets.req_enabled;
        await client.db.set("settings", sets);

        return sets.req_enabled;
    }

    async set(client: Gdreqbot, key: string, value: string) {
        let sets: Settings = client.db.get("settings");
        
        // ugly as hell ik
        switch (key) {
            case "req_enabled": {
                if (value != "true" && value != "false")
                    return { status: ResCode.INVALID_VALUE };

                sets.req_enabled = (value == "true" ? true : false);
                await client.db.set("settings", sets);
                return { status: ResCode.OK };
            }

            case "max_per_user": {
                if (isNaN(parseInt(value)))
                    return { status: ResCode.INVALID_VALUE };

                sets.max_per_user = parseInt(value);
                await client.db.set("settings", sets);
                return { status: ResCode.OK };
            }

            case "max_queue": {
                if (isNaN(parseInt(value)))
                    return { status: ResCode.INVALID_VALUE };

                sets.max_queue = parseInt(value);
                await client.db.set("settings", sets);
                return { status: ResCode.OK };
            }

            default:
                return { status: ResCode.INVALID_KEY };
        }
    }
}

export default Request;

export interface LevelData {
    name: string;
    creator: string;
    id: string;
    user: string;
}

export interface Settings {
    req_enabled?: boolean;
    max_per_user?: number;
    max_queue?: number;
}

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
    END,
    ERROR
}
