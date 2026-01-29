import { ChatMessage } from "@twurple/chat";
import Gdreqbot from "../core";
import PermLevels from "./PermLevels";

class BaseCommand {
    info: Info;
    config: Config;

    constructor({
        name = "",
        description = "Not specified",
        category = "others",
        privilegeDesc = "Not specified",
        args = "",
        privilegeArgs = "",
        aliases = [] as string[],
        cooldown = 3,
        enabled = false,
        permLevel = PermLevels.USER,
        supportsPrivilege = false,
        supportsSilent = false
    }) {
        this.info = { name, description, category, privilegeDesc, args, privilegeArgs };
        this.config = { aliases, cooldown, enabled, permLevel, supportsPrivilege, supportsSilent };
    }

    async run(client: Gdreqbot, msg: ChatMessage, channel: string, args?: string[], opts?: { userPerms?: PermLevels, privilegeMode?: boolean, auto?: boolean, silent?: boolean }) {}
}

interface Info {
    name: string;
    description?: string;
    category?: string;
    privilegeDesc?: string;
    args?: string;
    privilegeArgs?: string;
}

interface Config {
    aliases?: string[];
    cooldown?: number;
    enabled?: boolean;
    permLevel?: PermLevels;
    supportsPrivilege?: boolean;
    supportsSilent?: boolean;
}

export default BaseCommand;
