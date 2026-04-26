const { app } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

function handleSquirrelEvent() {
    if (process.argv.length === 1) {
        return false;
    }

    const appFolder = path.resolve(process.execPath, '..');
    const rootAtomFolder = path.resolve(appFolder, '..');
    const updateDotExe = path.resolve(rootAtomFolder, 'Update.exe');
    const exeName = path.basename(process.execPath);

    const spawnUpdate = function (args) {
        let spawnedProcess;

        try {
            spawnedProcess = spawn(updateDotExe, args, { detached: true });
        } catch (error) {
            console.error('Failed to spawn squirrel update:', error);
        }

        if (spawnedProcess) {
            spawnedProcess.unref();
        }
    };

    const squirrelEvent = process.argv[1];

        switch (squirrelEvent) {
        case '--squirrel-install':
        case '--squirrel-updated':

            spawnUpdate(['--createShortcut', exeName]);
            setTimeout(() => app.quit(), 1000);
            return true;

        case '--squirrel-uninstall':

            spawnUpdate(['--removeShortcut', exeName]);
            setTimeout(() => app.quit(), 1000);
            return true;

        case '--squirrel-obsolete':


            app.quit();
            return true;

                    case '--squirrel-firstrun':

            return false;
    }

    return false;
}

module.exports = handleSquirrelEvent;
