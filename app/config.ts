import { LoggerTransport } from 'nest-logger';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

export class ConfigHelper {
    private readonly envConfig: { [key: string]: string };

    constructor() {
        let filePath = 'app.cfg';
        fs.statSync(filePath);
        this.envConfig = dotenv.parse(fs.readFileSync(filePath));
    }

    get(key: string): string {
        return this.envConfig[key];
    }

    get SyncFolder(): string {
        return this.envConfig.SYNC_FOLDER;
    }

    get MaxFiles(): number {
        const strValue = this.envConfig.MAX_FILES;
        if (!strValue) return 0;
        const value = Number.parseInt(strValue);
        return value;
    }

    get FilesMask(): string[] {
        const value = this.envConfig.FILES_MASK;
        let parts = value.split(',');
        parts = parts
            .filter(e => e && e.trim() !== '')
            .map(e => e.trim());
        return parts;
    }

    get DropboxFolder(): string {
        return this.envConfig.DROPBOX_FOLDER;
    }

    get DropboxAppToken(): string {
        return this.envConfig.DROPBOX_APP_TOKEN;
    }

    get DeleteFileAfterSync(): boolean {
        return JSON.parse(this.envConfig.DELETE_FILE_AFTER_SYNC);
    }

    get LogLevel(): string {
        return this.envConfig.LOG_LEVEL;
    }

    get ServiceName(): string {
        return this.envConfig.SERVICE_NAME;
    }

    get LogFilePath(): string {
        return this.envConfig.LOG_FILE_PATH;
    }

    get Loggers(): LoggerTransport[] {
        const result = new Array(0);
        const loggers = this.envConfig.LOGGERS.split(',');
        loggers.forEach(e => {
            if (e.trim().toLowerCase() === 'rotate') {
                result.push(LoggerTransport.ROTATE);
            }
            if (e.trim().toLowerCase() === 'console') {
                result.push(LoggerTransport.CONSOLE);
            }
        });
        return result;
    }
}