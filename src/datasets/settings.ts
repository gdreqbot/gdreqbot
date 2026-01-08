export const defaultValues: Settings = {
    channelId: "",
    channelName: "",
    req_enabled: false,
    prefix: "!",
    max_levels_per_user: -1,
    max_queue_size: -1,
    random_queue: false,
    first_time: true
}

export interface Settings {
    channelId: string;
    channelName: string;
    req_enabled?: boolean;
    prefix?: string;
    max_levels_per_user?: number;
    max_queue_size?: number;
    random_queue?: boolean;
    first_time: boolean;
}
