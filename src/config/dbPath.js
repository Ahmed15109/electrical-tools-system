const path = require('path');
const fs = require('fs');

function resolveDbPath() {
    let app;
    let isPackaged = false;

    try {
        const electron = require('electron');
        app = electron.app || electron.remote.app;
        isPackaged = app ? app.isPackaged : false;
    } catch {


        return path.join(process.cwd(), 'database.db');
    }

    let dbPath;
    if (isPackaged) {

        const userDataPath = app.getPath('userData');

        if (!fs.existsSync(userDataPath)) {
            fs.mkdirSync(userDataPath, { recursive: true });
        }

                dbPath = path.join(userDataPath, 'database.db');


        if (!fs.existsSync(dbPath)) {
            console.log('[DB Path] New installation detected. Checking for template DB...');


            const templateLocations = [
                path.join(app.getAppPath(), 'database.db'),
                path.join(app.getAppPath(), 'database.sqlite'),
                path.join(process.resourcesPath, 'database.db') 
            ];

            for (const template of templateLocations) {
                if (fs.existsSync(template)) {
                    try {
                        fs.copyFileSync(template, dbPath);
                        console.log(`[DB Path] Successfully initialized from template: ${template}`);
                        break;
                    } catch (copyErr) {
                        console.error(`[DB Path] Failed to copy template from ${template}:`, copyErr);
                    }
                }
            }
        }
    } else {

        dbPath = path.join(app.getAppPath(), 'database.db');
    }

    return dbPath;
}

module.exports = { resolveDbPath };
