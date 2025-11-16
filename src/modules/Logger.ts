import color from "chalk";
import moment from "moment";
import "moment-duration-format";

class Logger {
    /**
     * 
     * @param content Content to log
     * @description Sends log content to stdout
     */
    log = (content: string) => {
        const timestamp = `[${moment(Date.now()).format("DD/MM/YYYY HH:mm:ss")}]:`;
        console.log(`${timestamp} ${color.blueBright("[LOG]")} ${content}`);
    }

    /**
     * 
     * @param content Content to log
     * @description Sends warn content to stdout
     */
    warn = (content: string) => {
        const timestamp = `[${moment(Date.now()).format("DD/MM/YYYY HH:mm:ss")}]:`;
        console.log(`${timestamp} ${color.yellowBright("[WARN]")} ${content}`);
    }

    /**
     * 
     * @param content Content to log
     * @param error Optional error to append
     * @description Sends error content to stderr
     */
    error = (content: unknown, error?: any) => {
        const timestamp = `[${moment(Date.now()).format("DD/MM/YYYY HH:mm:ss")}]:`;
        console.error(`${timestamp} ${color.redBright("[ERR]")} ${content}`, error);
    }

    /**
     * 
     * @param content Content to log
     * @param logs Additional debugging logs
     * @description Sends debugging content to stdout
     */
    debug = (content: string, logs?: any) => {
        const timestamp = `[${moment(Date.now()).format("DD/MM/YYYY HH:mm:ss")}]:`;
        console.log(`${timestamp} ${color.rgb(255, 165, 0)("[DEBUG]")} ${content}\n${logs as string | ""}`);
    }

    /**
     * 
     * @param userName User that ran the command
     * @param guildName Guild where the command was run
     * @param cmdName Command
     * @description Logs command execution
     */
    cmdlog = (userName: string, guildName: string, cmdName: string) => {
        const timestamp = `[${moment(Date.now()).format("DD/MM/YYYY HH:mm:ss")}]:`;
        console.log(`${timestamp} ${color.cyanBright("[CMD]")} ${color.greenBright(userName)} ran command: ${color.blueBright(cmdName)} in guild: ${color.blueBright(guildName)}`);
    }

    /**
     * 
     * @param appName Application name
     * @param guildCount Guild count
     * @description Logs a successful bot startup
     */
    ready = (appName: string, guildCount: number) => {
        const timestamp = `[${moment(Date.now()).format("DD/MM/YYYY HH:mm:ss")}]:`;
        console.log(`${timestamp} ${color.greenBright("[READY]")} Logged in as ${color.blueBright(appName)}. Running in ${color.greenBright(guildCount)} guilds`);
    }

    /**
     * @description Logs a bot reboot
     */
    reboot = () => {
        const timestamp = `[${moment(Date.now()).format("DD/MM/YYYY HH:mm:ss")}]:`;
        console.log(`${timestamp} ${color.magentaBright("[REBOOT]")} Rebooting...`);
    }
}

export default Logger;
