export interface User {
    userId: string;
    userName: string;
    platform?: Platform;
}

export interface Session extends User {
    secret: string;
    issued: number;
    expires: number;
}

export type Platform = "twitch" | "youtube";
