import path = require('path');
import { LoggerService } from 'nest-logger';
import { FilesHelper } from "./files-helper";
import { DropBoxHelper } from "./dropbox-helper";
import { ConfigHelper } from "./config";
import { FileInfo } from './file-info';
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

(async () => {
    const config = new ConfigHelper();
    const logger = new LoggerService(config.LogLevel, config.ServiceName, config.Loggers, config.LogFilePath);

    try {
        logger.debug(`[SyncApp] => Start Sync Folder '${config.SyncFolder}'`);

        const filesHelper = new FilesHelper();
        const folder = path.join(config.SyncFolder);
        const localFiles = filesHelper.getFiles(folder, config.FilesMask);

        logger.debug(`[SyncApp] => Local folder contains '${localFiles.length}' files(s) to process`);

        const dropboxHelper = new DropBoxHelper(logger, config.DropboxAppToken);
        let dropboxFiles = await dropboxHelper.getFolderFiles(config.DropboxFolder, config.FilesMask);

        logger.debug(`[SyncApp] => Dropbox folder contains '${dropboxFiles.length}' files(s)`);

        const filesToUpload = localFiles
            .filter(e => !dropboxFiles.map(e => e.name).includes(e.replace(/^.*[\\\/]/, '')));

        logger.debug(`[SyncApp] => Exists '${filesToUpload.length}' files(s) to sync`);

        if (filesToUpload && filesToUpload.length > 0) {
            const result = await dropboxHelper.uploadFileBatch(config.DropboxFolder, filesToUpload);
            if (!result) {
                logger.error(`[SyncApp] => ` + `Finished With Error`);
            }
        }

        if (config.MaxFiles > 0) {
            dropboxFiles = await dropboxHelper.getFolderFiles(config.DropboxFolder, config.FilesMask);
            await deleteOutdatedFilesFromDropboxFolder(logger, config.MaxFiles, config.FilesMask, dropboxHelper, config.DropboxFolder, dropboxFiles);
        }

        if (localFiles && config.DeleteFileAfterSync && localFiles.length > 0) {
            filesHelper.deleteFiles(localFiles);
        }
        logger.debug(`[SyncApp] => Finish`);
    } catch (err) {
        logger.error(`[SyncApp] => Exception: ${JSON.stringify(err)}`);
    }

})();

async function deleteOutdatedFilesFromDropboxFolder(logger: LoggerService, maxFiles: number, fileMasks: string[],
    dropboxHelper: DropBoxHelper, dropboxFolder: string, dropboxFiles: FileInfo[]): Promise<boolean> {
    let filesForDelete: string[] = [];
    for (let mask of fileMasks) {
        const filteredDropboxFiles = dropboxFiles
            .filter(e => e.name.match(mask))
            .sort((a, b) => a.modified.getTime() - b.modified.getTime());
        if (filteredDropboxFiles.length > maxFiles) {
            const dropboxFilesForDelete = filteredDropboxFiles
                .slice(0, filteredDropboxFiles.length - maxFiles)
                .map(e => e.name);

            filesForDelete = filesForDelete.concat(dropboxFilesForDelete);
        }
    }
    if (filesForDelete.length > 0) {
        logger.debug(`[SyncApp] => Need to delete '${filesForDelete.length}' file(s) from DropBox folder '${dropboxFolder}'`);
        await dropboxHelper.deleteFileFromFolderBatch(dropboxFolder, filesForDelete);
    }
    return true;
}

