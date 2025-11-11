class BaseCommand {
    config: Config;

    constructor({
        name = "",
        description = "Not specified",
        args = [],
        cooldown = 3,
        enabled = false,
        devOnly = false,
    }) {
        this.config = { name, description, args, cooldown, enabled, devOnly };
    }
}

interface Config {
    name: string;
    description?: string;
    args?: string[];
    cooldown?: number;
    enabled?: boolean;
    devOnly?: boolean;
}

export default BaseCommand;
