export interface User {
    userId: string;
    userName: string;
    platform?: Platform;
}

export type Platform = "twitch" | "youtube";
