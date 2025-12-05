import MapDB from "@galaxy05/map.db";
import { readdirSync } from "fs";

class Database {
    private db: MapDB;

    constructor(filename: string) {
        this.db = new MapDB(filename);
    }

    async init() {
        let datasets = readdirSync("./dist/datasets/").filter(f => f.endsWith(".js"));
        for (const dataset of datasets) {
            let path = dataset.split(".")[0];

            if (!this.db.get(path))
                await this.db.set(path, []);
        }
    }

    async setDefault(query: any) {
        let datasets = readdirSync("./dist/datasets/").filter(f => f.endsWith(".js"));
        for (const dataset of datasets) {
            let path = dataset.split(".")[0];
            let entry = this.objQuery(this.db.get(path), query);

            if (!entry.data?.length)
                await this.save(path, query);
        }
    }

    async deleteAll(query: any) {
        let datasets = readdirSync("./dist/datasets/").filter(f => f.endsWith(".js"));
        for (const dataset of datasets) {
            let path = dataset.split(".")[0];
            let entry = this.objQuery(this.db.get(path), query);

            if (entry.data?.length)
                await this.delete(path, query);
        }
    }

    load(path: string, query: any, multiple?: boolean): any|null {
        let data = this.db.get(path);
        let entry = this.objQuery(data, query);

        if (entry.data?.length)
            return multiple ? entry.data : entry.data[0];
        else
            return null;
    }

    async save(path: string, query: any, newData?: any) {
        const { defaultValues } = require(`../datasets/${path}.js`);
        let data = this.db.get(path);
        let entry = this.objQuery(data, query);

        if (entry.data?.length) {
            const updated = Object.assign(structuredClone(entry.data[0]), newData);
            data[entry.idx[0]] = updated;
            await this.db.set(path, data);

            return entry.data[0];
        } else {
            entry = Object.assign(structuredClone(defaultValues), query, newData);
            data.push(entry);
            await this.db.set(path, data);

            return entry;
        }
    }

    async delete(path: string, query: any) {
        let data = this.db.get(path);
        let entries = this.objQuery(data, query);

        for (let i = 0; i < entries.data.length; i++) {
            data.splice(entries.idx[i], 1);
        }

        if (entries.data.length) await this.db.set(path, data);
        return entries.data;
    }

    private objQuery(data: any, query: any) {
        if (!data) return null;

        // imma fuckin genius
        let idx: number[] = [];
        let cb = (x: any, i: number) => {
            let obj: any = Object.entries(query); // [['id', '12345'], ['name', 'shish']]
            let match = true;
            for (let [key, value] of obj) {
                if (x[key] !== value) {
                    match = false;
                    break;
                }
            }
            
            if (match) idx.push(i);
            return match;
        };

        return { data: data.filter(cb), idx };
    }
}

export default Database;
