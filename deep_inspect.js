const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const os = require('os');



const paths = [
    path.join(process.cwd(), 'database.db'),
    path.join(process.cwd(), 'database.sqlite'),
    path.join(os.homedir(), 'AppData/Roaming/system_app/database.db'),
    path.join(os.homedir(), 'AppData/Roaming/system_offline/database.db'),
    path.join(os.homedir(), 'AppData/Roaming/Electron/database.db'),
];

async function inspect() {
    for (const p of paths) {
        if (!fs.existsSync(p)) continue;
        const size = fs.statSync(p).size;
        if (size < 100) continue; 

        console.log(`\nInspecting: ${p} (${size} bytes)`);
        await new Promise((resolve) => {
            const db = new sqlite3.Database(p);
            db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
                if (err) {
                    console.log('Error:', err.message);
                    db.close();
                    return resolve();
                }

                let pending = tables.length;
                if (pending === 0) {
                    db.close();
                    return resolve();
                }

                tables.forEach(t => {
                    db.all(`SELECT * FROM "${t.name}" LIMIT 1`, (err2, rows) => {
                        pending--;
                        if (!err2 && rows.length > 0) {
                            console.log(`  🟢 [${t.name}] has ${rows.length}+ rows! First row keys:`, Object.keys(rows[0]));
                            if (t.name === 'Customers' || t.name === 'customers') {
                                console.log('     Sample Customer:', rows[0].name, rows[0].phone);
                            }
                        }
                        if (pending === 0) {
                            db.close();
                            resolve();
                        }
                    });
                });
            });
        });
    }
}

inspect();
