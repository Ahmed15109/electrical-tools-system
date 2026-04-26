const { app, BrowserWindow, dialog } = require('electron');


if (require('./squirrel_startup.js')()) {
    return;
}

const path = require('path');
const { spawn } = require('child_process');
const net = require('net');

const { registerIpcHandlers } = require('./src/ipc/handlers');
const { registerBackupHandlers } = require('./src/ipc/backupHandlers');
const { registerSystemHandlers } = require('./src/ipc/fileHandlers');
const { registerPdfHandlers } = require('./src/ipc/pdfHandlers');

let mainWindow = null;
let splash = null;
let frontendProcess = null;   

const isDev = !app.isPackaged;







async function bootDatabase() {
    const initDatabase = require('./src/config/db');
    await initDatabase();
    console.log('[Electron] Database ready.');
}



function waitForPort(port, timeoutMs = 20000, intervalMs = 200) {
    return new Promise((resolve, reject) => {
        const deadline = Date.now() + timeoutMs;
        function attempt() {
            const sock = net.createConnection(port, '127.0.0.1');
            sock.once('connect', () => { sock.destroy(); resolve(); });
            sock.once('error', () => {
                sock.destroy();
                if (Date.now() >= deadline) {
                    reject(new Error(`Port ${port} not ready within ${timeoutMs}ms`));
                } else {
                    setTimeout(attempt, intervalMs);
                }
            });
        }
        attempt();
    });
}



function startViteDev() {
    return new Promise((resolve, reject) => {
        console.log('[Electron] Starting Vite dev server...');
        const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
        frontendProcess = spawn(npm, ['run', 'dev'], {
            cwd: path.join(app.getAppPath(), 'client'),
            shell: true,
            stdio: ['ignore', 'pipe', 'pipe']
        });
        frontendProcess.on('error', (err) => {
            console.error('[Frontend] Failed to start:', err);
            reject(err);
        });
        setTimeout(resolve, 2000);
    });
}

function waitForVite(retries = 15, delayMs = 1000) {
    const http = require('http');
    return new Promise((resolve, reject) => {
        function attempt(n) {
            http.get('http://localhost:5173', (res) => {
                if (res.statusCode === 200) { resolve(); }
                else { retry(n); }
            }).on('error', () => retry(n));
        }
        function retry(n) {
            if (n > 0) {
                console.log(`[Electron] Waiting for Vite... (${n} retries left)`);
                setTimeout(() => attempt(n - 1), delayMs);
            } else {
                reject(new Error('Vite dev server not reachable.'));
            }
        }
        attempt(retries);
    });
}



function createSplash() {
    splash = new BrowserWindow({
        width: 400, height: 300,
        frame: false, alwaysOnTop: true,
        transparent: true, skipTaskbar: true
    });
    splash.loadFile(path.join(__dirname, 'splash.html'));
}

function closeSplash() {
    if (splash && !splash.isDestroyed()) {
        splash.destroy();
        splash = null;
    }
}



async function createWindow() {
    console.log('[Electron] Creating main window...');

    mainWindow = new BrowserWindow({
        minWidth: 1000,
        minHeight: 700,
        title: 'System Management App',
        show: false,
        icon: path.join(__dirname, 'assets/icon.ico'),
        webPreferences: {

            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
        autoHideMenuBar: true
    });

    mainWindow.setMenu(null);

    mainWindow.once('ready-to-show', () => {
        console.log('[Electron] mainWindow ready-to-show fired.');
        closeSplash();
        if (mainWindow) {
            mainWindow.show();
            mainWindow.maximize();
        }
    });

   
    const safetyTimeout = setTimeout(() => {
        console.log('[Electron] Safety timeout triggered: forcing window to show.');
        if (mainWindow && !mainWindow.isVisible()) {
            closeSplash();
            mainWindow.show();
            mainWindow.maximize();
        }
    }, 8000);

    mainWindow.on('show', () => {
        clearTimeout(safetyTimeout);
    });

    try {
        if (isDev) {
            await mainWindow.loadURL('http://localhost:5173');
        } else {
            const indexPath = path.join(__dirname, 'client', 'dist', 'index.html');
            await mainWindow.loadFile(indexPath);
            mainWindow.webContents.closeDevTools();
        }
        console.log('[Electron] Window loaded successfully.');
    } catch (err) {
        console.error('[Electron] Failed to load frontend:', err);
        clearTimeout(safetyTimeout);
        closeSplash();
        dialog.showErrorBox('Load Error', 'Could not load the application interface.');
        app.quit();
        return;
    }

    mainWindow.on('closed', () => { mainWindow = null; });
}


const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });

    app.whenReady().then(async () => {

        registerIpcHandlers();
        registerBackupHandlers();
        registerSystemHandlers();
        registerPdfHandlers();

        createSplash();


        try {
            await bootDatabase();
        } catch (err) {
            console.error('[Electron] Database boot failed:', err);
            dialog.showErrorBox(
                'Database Error',
                `Failed to initialise the database:\n${err.message}`
            );
            app.quit();
            return;
        }


        if (isDev) {
            try {
                await startViteDev();
                await waitForVite();
            } catch (err) {
                console.error('[Electron] Vite not ready:', err);
                dialog.showErrorBox('Frontend Error', 'Vite dev server could not start.');
                app.quit();
                return;
            }
        }


        await createWindow();


        const autoBackup = require('./src/services/autoBackupService');
        autoBackup.run();

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) createWindow();
        });
    });
}



app.on('before-quit', () => {
    if (frontendProcess) {
        console.log('[Electron] Stopping Vite dev server...');
        if (process.platform === 'win32') {
            spawn('taskkill', ['/pid', frontendProcess.pid, '/f', '/t']);
        } else {
            frontendProcess.kill();
        }
        frontendProcess = null;
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
