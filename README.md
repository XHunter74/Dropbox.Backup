# PowerMonitor Dropbox Backup

This project is a Node.js/TypeScript application for synchronizing files from a local folder to Dropbox, with support for file retention policies and automatic cleanup. It is designed to run as a scheduled or manual backup utility.

## Features
- Syncs files from a local folder to a Dropbox folder
- Supports file name pattern matching (masks)
- Retains only a configurable number of the most recent files in Dropbox
- Optionally deletes local files after successful sync
- Detailed logging with support for rotating log files

## Requirements
- Node.js (v12 or later recommended)
- Dropbox API token

## Installation
1. Clone the repository or copy the project files.
2. Install dependencies:
   ```sh
   npm install
   ```
3. Copy `app.cfg.sample` to `app.cfg` and edit the configuration as needed:
   - Set your local sync folder, Dropbox token, file masks, and other options.

## Configuration
Edit `app.cfg` in the project root. Example:
```
SYNC_FOLDER=C:\to-backup
DELETE_FILE_AFTER_SYNC=true
FILES_MASK=files_[0-9]{4}-[0-9]{2}-[0-9]{2}.[0-9]{4}.zip
DROPBOX_FOLDER=""
DROPBOX_APP_TOKEN=your_dropbox_token
MAX_FILES=72
LOG_LEVEL="debug"
SERVICE_NAME="backups-sync"
LOGGERS="rotate, console"
LOG_FILE_PATH="logs"
```
- `SYNC_FOLDER`: Local folder to back up
- `DELETE_FILE_AFTER_SYNC`: Delete local files after upload (true/false)
- `FILES_MASK`: Comma-separated regex patterns for files to sync
- `DROPBOX_FOLDER`: Dropbox folder path (leave empty for root)
- `DROPBOX_APP_TOKEN`: Your Dropbox API token
- `MAX_FILES`: Maximum number of files to keep in Dropbox
- Logging options control log output and rotation

## Usage
### Build
```sh
npm run build
```

### Run
```sh
npm start
```

### Obfuscated Build
To create an obfuscated build (for distribution):
```sh
npm run build-obfuscator
```

## How It Works
- Scans the local folder for files matching the configured masks
- Uploads new files to Dropbox
- Deletes oldest files in Dropbox if the count exceeds `MAX_FILES`
- Optionally deletes local files after successful upload

## File Structure
- `app/` - Source TypeScript files
- `build/` - Compiled JavaScript output
- `build_obf/` - Obfuscated build output
- `logs/` - Log files
- `backup/` - Example backup files

## Logging
Logging is handled by [nest-logger](https://www.npmjs.com/package/nest-logger). Configure log level, file path, and appenders in `app.cfg`.

## License
MIT License

Copyright (c) 2025 Serhiy Krasovskyy xhunter74@gmail.com

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
