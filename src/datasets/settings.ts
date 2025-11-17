export const defaultValues: Settings = {
    channelId: "",
    channelName: "",
    req_enabled: false,
    max_per_user: 2,
    max_queue: -1
}

export interface Settings {
    channelId: string;
    channelName: string;
    req_enabled?: boolean;
    max_per_user?: number;
    max_queue?: number;
}
