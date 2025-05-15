import { LoggerService } from "nest-logger";
import { ConfigHelper } from "./config";

export class LoggerHelper {

    public static getLogger(config: ConfigHelper): LoggerService {
        const loggers = [
            LoggerService.console({
                timeFormat: "YYYY-MM-dd HH:mm:ss",
                colorize: true
            }),
            LoggerService.rotate({
                timeFormat: "YYYY-MM-dd HH:mm:ss",
                colorize: false,
                fileOptions: {
                    filename: `${config.LogFilePath}/${config.ServiceName}-%DATE%.log`,
                    maxFiles: config.MaxLogFiles,
                },
            }),
        ];
        return new LoggerService(config.LogLevel, loggers);
    }
}