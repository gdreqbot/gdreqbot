import Gdreqbot from "../modules/Bot";
import BaseCommand from "../structs/BaseCommand";

class CommandLoader {
    /**
     * @description Loads a command in the commands collection
     * @param client App client
     * @param cmdName Command name
     * @returns any
     */
    load = (client: Gdreqbot, cmdName: string) => {
        try {
            const cmd: BaseCommand = new (require(`../commands/${cmdName}`));

            if (cmd.config.enabled) {
                client.logger.log(`Loading command: ${cmd.info.name}`);
                client.commands.set(cmd.info.name, cmd);
            } else {
                client.logger.warn(`Command ${cmd.info.name} is disabled. Ignoring it`);
            }

            return false;
        } catch (err) {
            return `Failed to load command ${cmdName.split(".")}:\n${err}`;
        }
    }

    /**
     * @description Loads a dummy command in the dummyCmds collection (used for displaying purposes)
     * @param client App client
     * @param cmdName Command name
     * @returns any
     */
    loadDummy = (client: Gdreqbot, cmdName: string) => {
        try {
            const cmd: BaseCommand = new (require(`../commands/dummy/${cmdName}`));

            if (cmd.config.enabled) {
                client.logger.log(`Loading dummy command: ${cmd.info.name}`);
                client.dummyCmds.set(cmd.info.name, cmd);
            } else {
                client.logger.warn(`Dummy command ${cmd.info.name} is disabled. Ignoring it`);
            }

            return false;
        } catch (err) {
            return `Failed to load dummy command ${cmdName.split(".")}:\n${err}`;
        }
    }

    /**
     * @description Deletes a command from the commands collection
     * @param client App client
     * @param cmdName Command name
     * @returns any
     */
    unload = (client: Gdreqbot, cmdName: string) => {
        const cmd = client.commands.get(cmdName);
        if (!cmd) return cmdName;

        client.logger.log(`Unloading command ${cmd.info.name}`);
        delete require.cache[require.resolve(`./commands/${cmdName}.js`)];
        return false;
    }
}

export default CommandLoader;
