import PermLevels from "../structs/PermLevels";

export const defaultValues: Perms = {
    channelId: "",
    channelName: "",
    perms: []
}

export interface Perms {
    channelId: string;
    channelName: string;
    perms: Perm[]
}

export interface Perm {
    cmd: string;
    perm: PermLevels;
}
