import { User } from "../structs/user";

export const defaultValues: Blacklist = {
    channelId: "",
    channelName: "",
    users: []
}

export interface Blacklist {
    channelId: string;
    channelName: string;
    users: User[];
}
