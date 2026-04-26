const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const store = require('../config/store');

const { resolveDbPath } = require('../config/dbPath');

async function executeAutoBackup() {
    try {
        const isEnabled = store.get('autoBackupEnabled');
        if (!isEnabled) {
            console.log('[AutoBackup] Disabled in settings. Skipping.');
            return;
        }

        const lastBackupStr = store.get('lastBackupDate');
        const now = new Date();

                if (lastBackupStr) {
            const lastBackupDate = new Date(lastBackupStr);
            const diffTime = Math.abs(now - lastBackupDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

                        if (diffDays < 30) {
                console.log(`[AutoBackup] Last backup was ${diffDays} days ago. Threshold is 30. Skipping.`);
                return;
            }
        } else {
             console.log('[AutoBackup] Initial backup trigger activated (lastBackupDate is null).');
        }

        console.log('[AutoBackup] Threshold exceeded (or first run). Starting automatic offline backup...');

                let targetDir = store.get('backupPath');

                if (!targetDir || !fs.existsSync(targetDir)) {
             console.warn(`[AutoBackup] Custom path ${targetDir || 'is null'} missing or inaccessible. Falling back to userData.`);
             targetDir = path.join(app.getPath('userData'), 'backups');
        }

        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');

                const timestamp = `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;

                const fileName = `backup-${timestamp}.sqlite`;
        const destPath = path.join(targetDir, fileName);

        const currentDbPath = resolveDbPath();

                fs.copyFileSync(currentDbPath, destPath);
        console.log(`[AutoBackup] Target logged: ${destPath}`);

        store.set('lastBackupDate', now.toISOString());


        try {
            const { Notification } = require('electron');
            if (Notification.isSupported()) {
                new Notification({
                    title: 'النسخ الاحتياطي التلقائي',
                    body: `تم حفظ نسخة احتياطية بنجاح: ${fileName}`
                }).show();
            }
        } catch (e) {
            console.warn('[AutoBackup] Toast failed', e);
        }

        await rotateBackups(targetDir);

    } catch (error) {
        console.error('[AutoBackup] Encountered a background error:', error);
    }
}

async function rotateBackups(targetDir) {
    try {
        const maxBackups = store.get('maxBackups') || 10;
        const files = fs.readdirSync(targetDir);


        const backupFiles = files
            .filter(f => f.startsWith('backup-') && f.endsWith('.sqlite'))
            .map(f => {
                const fPath = path.join(targetDir, f);
                const stats = fs.statSync(fPath);
                return { file: f, path: fPath, creation: stats.mtime.getTime() };
            });


        backupFiles.sort((a, b) => b.creation - a.creation);

        if (backupFiles.length > maxBackups) {
            console.log(`[AutoBackup] Rotating database clusters ensuring limits stay < ${maxBackups}. Removals initiating...`);
            const filesToRemove = backupFiles.slice(maxBackups);

                        for (const f of filesToRemove) {
                 fs.unlinkSync(f.path);
                 console.log(`[AutoBackup] Pruned old backup: ${f.file}`);
            }
        }
    } catch (err) {
        console.error('[AutoBackup] Error during backup rotation cleanup:', err);
    }
}

function run() {

    setTimeout(() => {
        executeAutoBackup();
    }, 5000);
}

module.exports = { run };
