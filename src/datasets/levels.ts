import { User } from "../structs/user";

export const defaultValues: Levels = {
    channelId: "",
    channelName: "",
    levels: []
}

export interface Levels {
    channelId: string;
    channelName: string;
    levels: LevelData[];
}

export interface LevelData {
    name: string;
    creator: string;
    id: string;
    user?: User;
    notes?: string;
}
