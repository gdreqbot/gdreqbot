import MapDB from "@galaxy05/map.db";

export default class {
    private db: MapDB;

    constructor() {
        this.db = new MapDB("blacklist.db");
    }

    async init() {
        if (!this.db.get("users"))
            await this.db.set("users", []);

        if (!this.db.get("levels"))
            await this.db.set("levels", []);
    }

    async add(query: string, type: "users" | "levels") {
        let data = this.db.get(type);

        data?.length ? data.push(query) : data = [query];
        await this.db.set(type, data);
    }

    async remove(query: string, type: "users" | "levels") {
        let data = this.db.get(type);

        data?.length ? data.splice(data.indexOf(query), 1) : data = [];
        await this.db.set(type, data);
    }

    async clear(type: "users" | "levels") {
        await this.db.set(type, []);
    }

    has(query: string, type: "users" | "levels") {
        let data = this.db.get(type);
        return data.find((d: string) => d == query) ? true : false;
    }
}
