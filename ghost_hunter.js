const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const os = require('os');






const searchFolders = [
    process.cwd(),
    path.join(process.cwd(), 'client'),
    path.join(os.homedir(), 'AppData/Roaming/system_app'),
    path.join(os.homedir(), 'AppData/Roaming/system_offline'),
    path.join(os.homedir(), 'AppData/Roaming/Electron'),
    path.join(os.homedir(), 'AppData/Roaming/System Management App'),
];

console.log('--- Deep Database Hunt ---');

async function scan() {
    for (const folder of searchFolders) {
        if (!fs.existsSync(folder)) continue;
        console.log(`\nScanning Folder: ${folder}`);

                const files = fs.readdirSync(folder);
        for (const file of files) {
            if (file.endsWith('.db') || file.endsWith('.sqlite')) {
                const fullPath = path.join(folder, file);
                const size = fs.statSync(fullPath).size;
                console.log(`  [FILE] ${file} (${size} bytes)`);

                                if (size > 0) {
                    await inspectDb(fullPath);
                }
            }
        }
    }
}

function inspectDb(dbPath) {
    return new Promise((resolve) => {
        const db = new sqlite3.Database(dbPath);
        db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
            if (err) {
                console.log(`    Error listing tables: ${err.message}`);
                db.close();
                return resolve();
            }

            const tableNames = tables.map(t => t.name).filter(n => !n.startsWith('sqlite_'));
            if (tableNames.length === 0) {
                console.log(`    (No user tables)`);
                db.close();
                return resolve();
            }

            const counts = [];
            let processed = 0;

                        tableNames.forEach(name => {
                db.get(`SELECT COUNT(*) as count FROM "${name}"`, (err2, row) => {
                    processed++;
                    if (!err2 && row.count > 0) {
                        counts.push(`${name}(${row.count})`);
                    }
                    if (processed === tableNames.length) {
                        if (counts.length > 0) {
                            console.log(`    ⚡ DATA FOUND: ${counts.join(', ')}`);
                        } else {
                            console.log(`    (All tables empty: ${tableNames.join(', ')})`);
                        }
                        db.close();
                        resolve();
                    }
                });
            });

                        if (tableNames.length === 0) {
                db.close();
                resolve();
            }
        });
    });
}

scan();
