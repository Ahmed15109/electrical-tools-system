
const { ipcMain, app, dialog, BrowserWindow } = require('electron');
const fs   = require('fs');
const path = require('path');
const { resolveDbPath } = require('../config/dbPath');


const pad = (n) => String(n).padStart(2, '0');


function buildDefaultFileName() {
    const d = new Date();
    const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const time = `${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
    return `backup_${date}_${time}.db`;
}

function getWindow() {
    return BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0] || null;
}


async function handleBackup() {
    const dbFile = resolveDbPath();


    if (!fs.existsSync(dbFile)) {
        return { success: false, message: 'ملف قاعدة البيانات غير موجود.' };
    }

    const { filePath, canceled } = await dialog.showSaveDialog(getWindow(), {
        title: 'حفظ نسخة احتياطية',
        defaultPath: buildDefaultFileName(),
        filters: [
            { name: 'SQLite Database', extensions: ['db'] },
            { name: 'All Files',       extensions: ['*'] }
        ]
    });

    if (canceled || !filePath) {
        return { success: false, message: 'تم إلغاء العملية.' };
    }

    try {

        fs.copyFileSync(dbFile, filePath);
        console.log(`[Backup] Saved to: ${filePath}`);
        return {
            success: true,
            message: `تم حفظ النسخة الاحتياطية بنجاح.`,
            path: filePath
        };
    } catch (err) {
        console.error('[Backup] Error:', err);
        return { success: false, message: `فشل الحفظ: ${err.message}` };
    }
}



async function handleRestore() {
    const dbFile = resolveDbPath();

    const { filePaths, canceled } = await dialog.showOpenDialog(getWindow(), {
        title: 'اختر ملف النسخة الاحتياطية',
        filters: [
            { name: 'SQLite Database', extensions: ['db'] },
            { name: 'All Files',       extensions: ['*'] }
        ],
        properties: ['openFile']
    });

    if (canceled || !filePaths || filePaths.length === 0) {
        return { success: false, message: 'تم إلغاء العملية.' };
    }

    const sourcePath = filePaths[0];


    try {
        const stat = fs.statSync(sourcePath);
        if (stat.size === 0) {
            return { success: false, message: 'الملف المختار فارغ.' };
        }
    } catch {
        return { success: false, message: 'لا يمكن قراءة الملف المختار.' };
    }


    const { response } = await dialog.showMessageBox(getWindow(), {
        type: 'warning',
        title: 'تأكيد الاستعادة',
        message: 'سيتم استبدال قاعدة البيانات الحالية بالنسخة الاحتياطية المختارة.',
        detail: 'سيُعاد تشغيل البرنامج تلقائيًا بعد الاستعادة. هل تريد المتابعة؟',
        buttons: ['متابعة', 'إلغاء'],
        defaultId: 0,
        cancelId: 1
    });

    if (response !== 0) {
        return { success: false, message: 'تم إلغاء الاستعادة.' };
    }

    try {

        const db = require('../models');
        await db.sequelize.close();
        console.log('[Restore] Sequelize closed.');


        const tmpPath = dbFile + '.restoring';
        fs.copyFileSync(sourcePath, tmpPath);
        fs.renameSync(tmpPath, dbFile);  

        console.log(`[Restore] Restored from: ${sourcePath}`);
        return {
            success: true,
            message: 'تمت الاستعادة بنجاح. سيُعاد تشغيل البرنامج الآن.',
            requiresRestart: true
        };
    } catch (err) {
        console.error('[Restore] Error:', err);
        return { success: false, message: `فشلت الاستعادة: ${err.message}` };
    }
}



function handleRestart() {
    app.relaunch();
    app.exit(0);
}

function registerBackupHandlers() {
    ipcMain.handle('system:backup',  async () => handleBackup());
    ipcMain.handle('system:restore', async () => handleRestore());
    ipcMain.handle('system:restart', ()       => handleRestart());

    ipcMain.handle('system:selectBackupFolder', async () => {
        const { filePaths, canceled } = await dialog.showOpenDialog(getWindow(), {
            title: 'اختر مجلد حفظ النسخ الاحتياطية',
            properties: ['openDirectory']
        });

                if (canceled || !filePaths || filePaths.length === 0) {
             return { success: false, message: 'مُلغى' };
        }
        return { success: true, path: filePaths[0] };
    });

    ipcMain.handle('system:openBackupFolder', async () => {
        const store = require('../config/store');
        let folderPath = store.get('backupPath');
        if (!folderPath || !fs.existsSync(folderPath)) {
            folderPath = path.join(app.getPath('userData'), 'backups');
            if (!fs.existsSync(folderPath)) {
                fs.mkdirSync(folderPath, { recursive: true });
            }
        }

                const { shell } = require('electron');
        await shell.openPath(folderPath);
        return { success: true };
    });

    ipcMain.handle('system:getSettings', () => {
        const store = require('../config/store');
        return store.store;
    });

    ipcMain.handle('system:updateSettings', (_event, updates) => {
        const store = require('../config/store');
        for (const [key, val] of Object.entries(updates)) {
            store.set(key, val);
        }
        return { success: true };
    });

    console.log('[IPC] Backup handlers registered.');
}

module.exports = { registerBackupHandlers };
