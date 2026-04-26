const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const os = require('os');






const dbPath = path.join(os.homedir(), 'AppData/Roaming/system_app/database.db');
console.log('Inspecting:', dbPath);

if (!fs.existsSync(dbPath)) {
    console.error('File not found!');
    process.exit(1);
}

const db = new sqlite3.Database(dbPath);

db.serialize(() => {

    db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
        if (err) return console.error(err);

                console.log('\n--- TABLES FOUND ---');
        tables.forEach(t => {
            db.get(`SELECT COUNT(*) as count FROM ${t.name}`, (err2, row) => {
                if (err2) {
                    console.log(`[!] ${t.name}: Error (${err2.message})`);
                } else {
                    console.log(`[+] ${t.name}: ${row.count} rows`);
                }
            });
        });
    });
});

setTimeout(() => db.close(), 2000);
