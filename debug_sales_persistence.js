const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const os = require('os');





const possiblePaths = [
    path.join(process.cwd(), 'database.db'),
    path.join(os.homedir(), 'AppData/Roaming/system_app/database.db'),
    path.join(os.homedir(), 'AppData/Roaming/Electron/database.db'),
];

async function debug() {
    console.log('--- Sales Persistence Diagnostic ---');

        for (const dbPath of possiblePaths) {
        if (!fs.existsSync(dbPath)) continue;

                console.log(`\nChecking: ${dbPath}`);
        const db = new sqlite3.Database(dbPath);

                await new Promise((resolve) => {
            db.serialize(() => {

                db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='Sales'", (err, row) => {
                    if (err) {
                        console.log('  [!] Error fetching Sales DDL:', err.message);
                    } else if (!row) {
                        console.log('  [X] Table "Sales" DOES NOT EXIST.');
                    } else {
                        console.log('  [DDL] Sales Table:', row.sql);
                    }
                });


                const tables = ['Customers', 'Products', 'Sales', 'Payments', 'Installments'];
                tables.forEach(t => {
                    db.get(`SELECT COUNT(*) as count FROM "${t}"`, (err, row) => {
                        if (err) console.log(`  [!] Error counting ${t}:`, err.message);
                        else console.log(`  [+] ${t}: ${row.count} rows`);
                    });
                });


                db.all("SELECT * FROM Sales LIMIT 3", (err, rows) => {
                    if (err) {

                    } else if (rows.length > 0) {
                        console.log('  [DATA] Sample Sales found:', JSON.stringify(rows, null, 2));
                    } else {
                        console.log('  [DATA] Sales table is EMPTY.');
                    }
                });

                setTimeout(resolve, 1500);
            });
        });
        db.close();
    }
}

debug();
