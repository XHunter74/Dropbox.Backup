import { LoggerService } from 'nest-logger';
import fs = require('fs');
import path = require('path');
import { FileInfo } from './file-info';

export class DropBoxHelper {

    dropbox: any;

    constructor(private logger: LoggerService, dropboxToken: string) {
        const dropboxV2Api = require('dropbox-v2-api');
        this.dropbox = dropboxV2Api.authenticate({
            token: dropboxToken
        })
    }

    getFolderFiles(folder: string, fileMasks: string[]): Promise<FileInfo[]> {
        this.logger.debug(`[${DropBoxHelper.name}].${this.getFolderFiles.name} => ` +
            `Folder: '${folder}'`);
        if (folder && folder != '' && !folder.startsWith('/')) {
            folder = '/' + folder;
        }
        const promise = new Promise<FileInfo[]>(
            (resolve, reject) => {
                this.dropbox({
                    resource: 'files/list_folder',
                    parameters: {
                        path: folder,
                        recursive: false,
                        include_media_info: false,
                        include_deleted: false,
                        include_has_explicit_shared_members: false,
                        include_mounted_folders: false,
                        include_non_downloadable_files: false,
                        limit: 1000
                    }
                }, async (err: any, result: any, response: any) => {
                    if (err) {
                        this.logger.error(`[${DropBoxHelper.name}].${this.getFolderFiles.name} => ` +
                            `Exception: '${JSON.stringify(err)}'`);
                        reject(err);
                    } else {
                        const files: FileInfo[] = this.entriesToFiles(result.entries, fileMasks);
                        let has_more = result.has_more;
                        let cursor = result.cursor;
                        while (has_more) {
                            const continueResult = await this.continueGetFoldersFiles(cursor);
                            cursor = continueResult.cursor;
                            has_more = continueResult.has_more;
                            const continueFiles: FileInfo[] = this.entriesToFiles(continueResult.entries, fileMasks);
                            this.addUniqueItemsToArray(files, continueFiles);
                        }
                        this.logger.debug(`[${DropBoxHelper.name}].${this.getFolderFiles.name} => ` +
                            `Dropbox folder contains '${files.length}' file(s)`);
                        resolve(files);
                    }
                });
            });
        return promise;
    }

    private addUniqueItemsToArray(array: FileInfo[], items: FileInfo[]): boolean {
        let changed = false;
        const uniqueItems = items.filter(item2 => !array.some(item1 => item1.name === item2.name));
        if (uniqueItems && uniqueItems.length > 0) {
            array.push(...uniqueItems);
            changed = true;
        }
        return changed;
    }

    private entriesToFiles(entries: any, fileMasks: string[]): FileInfo[] {
        const files: FileInfo[] = entries
            .filter((e: any) => e['.tag'] === 'file')
            .map((e: any) => {
                const fileInfo = new FileInfo();
                fileInfo.name = String(e.name).toLowerCase();
                fileInfo.modified = new Date(e.server_modified);
                fileInfo.size = e.size;
                return fileInfo;
            })
            .filter((e: FileInfo) => isMatchWithAnyPattern(e.name, fileMasks));
        return files;
    }

    continueGetFoldersFiles(cursor: string): Promise<any> {
        const promise = new Promise<FileInfo[]>(
            (resolve, reject) => {
                this.dropbox({
                    resource: 'files/list_folder/continue',
                    parameters: {
                        cursor: cursor
                    }
                }, async (err: any, result: any, response: any) => {
                    if (err) {
                        this.logger.error(`[${DropBoxHelper.name}].${this.getFolderFiles.name} => ` +
                            `Exception: '${JSON.stringify(err)}'`);
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
            });
        return promise;
    }

    deleteFileFromFolder(folder: string, fileName: string): Promise<boolean> {
        this.logger.debug(`[${DropBoxHelper.name}].${this.deleteFileFromFolder.name} => ` +
            `Folder: '${folder}'`);
        if (folder && folder != '' && !folder.startsWith('/')) {
            folder = '/' + folder;
        }
        const promise = new Promise<boolean>(
            (resolve, reject) => {
                this.dropbox({
                    resource: 'files/delete',
                    parameters: {
                        path: `${folder}/${fileName}`
                    }
                }, (err: any, result: any, response: any) => {
                    if (err) {
                        this.logger.error(`[${DropBoxHelper.name}].${this.deleteFileFromFolder.name} => ` +
                            `Exception: '${JSON.stringify(err)}'`);
                        reject(err);
                    } else {
                        resolve(true);
                    }
                });
            });
        return promise;
    }

    uploadFile(file: string): Promise<boolean> {
        const promise = new Promise<boolean>(
            (resolve, reject) => {
                if (fs.existsSync(file)) {
                    const fileName = `/${path.basename(file)}`;
                    this.dropbox({
                        resource: 'files/upload',
                        parameters: {
                            path: fileName
                        },
                        readStream: fs.createReadStream(file)
                    }, (err: any, result: any, response: any) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(true);
                        }
                    });
                } else {
                    reject(`File '${file}' doesn't exist.`);
                }
            }
        );
        return promise;
    }

    async uploadFileBatch(folder: string, files: string[]): Promise<boolean> {
        this.logger.debug(`[${DropBoxHelper.name}].${this.uploadFileBatch.name} => ` +
            `Need to upload: '${files.length}' file(s) to folder '${folder}'`);
        const existedFiles = files
            .filter(e => fs.existsSync(e));

        if (folder != '' && !folder.endsWith('/')) {
            folder = folder + '/';
        }
        const entries = Array().fill(0);

        for (let i = 0; i < existedFiles.length; i++) {
            this.logger.debug(`[${DropBoxHelper.name}].${this.uploadFileBatch.name} => ` +
                `Uploading file: '${existedFiles[i]}'`);
            const sessionId = await this.startUpload();
            const appendResult = await this.appendUpload(sessionId, existedFiles[i]);
            if (appendResult) {
                const entry = {
                    cursor: {
                        session_id: sessionId,
                        offset: this.getFileSize(existedFiles[i])
                    },
                    commit: {
                        path: `/${folder}${path.basename(existedFiles[i])}`,
                        mode: 'add',
                        autorename: false,
                        mute: false,
                        strict_conflict: false
                    }
                }
                entries.push(entry);
            }
        }
        if (entries && entries.length > 0) {
            const jobId = await this.commitUpload(entries);
            const checkJobState = await this.checkJobState(jobId);
            if (checkJobState) {
                this.logger.debug(`[${DropBoxHelper.name}].${this.uploadFileBatch.name} => ` +
                    `Finished Successfully`);
            } else {
                this.logger.error(`[${DropBoxHelper.name}].${this.uploadFileBatch.name} => ` +
                    `Finished With Error`);
            }
            return checkJobState;
        }
        return false;
    }

    private checkJobState(jobId: string): Promise<boolean> {
        const promise = new Promise<boolean>(
            (resolve, reject) => {
                this.dropbox({
                    resource: 'files/upload_session/finish_batch/check',
                    parameters: {
                        async_job_id: jobId
                    },
                }, (err: any, result: any, response: any) => {
                    if (err) {
                        reject(err);
                    } else {
                        const tag = result['.tag'];
                        if (tag === 'in_progress' || tag === 'complete') {
                            resolve(true);
                        }
                        reject('Could not sync files with Dropbox');
                    }
                });
            }
        );
        return promise;
    }

    private commitUpload(entries: any): Promise<string> {
        const promise = new Promise<string>(
            (resolve, reject) => {
                this.dropbox({
                    resource: 'files/upload_session/finish_batch',
                    parameters: {
                        entries: entries
                    },
                }, (err: any, result: any, response: any) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result.async_job_id);
                    }
                });
            }
        );
        return promise;
    }

    private appendUpload(sessionId: string, fileName: string): Promise<boolean> {
        const promise = new Promise<boolean>(
            (resolve, reject) => {
                this.dropbox({
                    resource: 'files/upload_session/append_v2',
                    parameters: {
                        cursor: {
                            session_id: sessionId,
                            offset: 0
                        },
                        close: true
                    },
                    readStream: fs.createReadStream(fileName)
                }, (err: any, result: any, response: any) => {
                    if (err) {
                        resolve(false);
                    } else {
                        resolve(true);
                    }
                });
            }
        );
        return promise;
    }

    private startUpload(): Promise<string> {
        const promise = new Promise<string>(
            (resolve, reject) => {
                this.dropbox({
                    resource: 'files/upload_session/start',
                    parameters: {
                        close: false
                    },
                }, (err: any, result: any, response: any) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result.session_id);
                    }
                });
            }
        );
        return promise;
    }

    private getFileSize(filename: string) {
        const stats = fs.statSync(filename);
        const fileSizeInBytes = stats.size;
        return fileSizeInBytes;
    }

    public deleteFileFromFolderBatch(folder: string, files: string[]): Promise<boolean> {
        this.logger.debug(`[${DropBoxHelper.name}].${this.deleteFileFromFolderBatch.name} => ` +
            `Need to delete: '${files.length}' file(s) from folder '${folder}'`);

        if (folder && folder != '' && !folder.startsWith('/')) {
            folder = '/' + folder;
        }

        const entries = files
            .map(e => {
                const item = { path: `${folder}/${e}` };
                return item;
            });

        const promise = new Promise<boolean>(
            (resolve, reject) => {
                this.dropbox({
                    resource: 'files/delete_batch',
                    parameters: {
                        entries: entries
                    },
                }, (err: any, result: any, response: any) => {
                    if (err) {
                        this.logger.error(`[${DropBoxHelper.name}].${this.deleteFileFromFolder.name} => ` +
                            `Exception: '${JSON.stringify(err)}'`);
                        reject(err);
                    } else {
                        this.logger.debug(`[${DropBoxHelper.name}].${this.deleteFileFromFolderBatch.name} => ` +
                            `Finished Successfully`);
                        resolve(true);
                    }
                });
            }
        );
        return promise
    }
}

function isMatchWithAnyPattern(fileName: string, patterns: string[]): boolean {
    for (let pattern of patterns) {
        if (fileName.match(pattern)) {
            return true;
        }
    }
    return false;
}