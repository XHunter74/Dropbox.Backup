import fs = require('fs');

export class FilesHelper {

    constructor() { }

    getFiles(folder: string, fileMasks: string[]): string[] {
        let result: string[] = [];
        fileMasks.forEach(mask => {
            const files = fs.readdirSync(folder)
                .filter((e: string) => e.match(mask))
                .map(e => `${folder}${e}`);
            result = result.concat(files);
        });

        return result;
    }

    deleteFiles(files: string[]) {
        files = files
            .filter(e => fs.existsSync(e));
        files.forEach(e => {
            fs.unlinkSync(e);
        });
    }
}