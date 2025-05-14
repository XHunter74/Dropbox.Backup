import fs = require('fs');

export class FilesHelper {

    constructor() { }

    getFiles(folder: string, fileMasks: string[]): string[] {
        let result: string[] = [];
        for (let i = 0; i < fileMasks.length; i++) {
            const mask = fileMasks[i];
            const files = fs.readdirSync(folder)
                .filter((e: string) => e.match(mask))
                .map(e => `${folder}${e}`);
            result = result.concat(files);
        }
        return result;
    }

    deleteFiles(files: string[]) {
        files = files.filter(e => fs.existsSync(e));
        for (let i = 0; i < files.length; i++) {
            fs.unlinkSync(files[i]);
        }
    }
}