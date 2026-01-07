import { User } from "../structs/user";
import { LevelData } from "./levels";

export const defaultValues: Blacklist = {
    channelId: "",
    channelName: "",
    users: [],
    levels: [],
}

export interface Blacklist {
    channelId: string;
    channelName: string;
    users: User[];
    levels: LevelData[];
}
