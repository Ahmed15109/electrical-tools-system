const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const os = require('os');





const possiblePaths = [
    path.join(process.cwd(), 'database.db'),
    path.join(process.cwd(), 'database.sqlite'),
    path.join(os.homedir(), 'AppData/Roaming/system_app/database.db'),
    path.join(os.homedir(), 'AppData/Roaming/system_offline/database.db'),
    path.join(os.homedir(), 'AppData/Roaming/System Management App/database.db'),
];

console.log('--- Searching for active database ---');

function auditFile(dbPath) {
    return new Promise((resolve) => {
        if (!fs.existsSync(dbPath)) {
            console.log(`[ABSENT] ${dbPath}`);
            return resolve(null);
        }

        const size = fs.statSync(dbPath).size;
        if (size === 0) {
            console.log(`[EMPTY]  ${dbPath} (0 bytes)`);
            return resolve(null);
        }

        console.log(`[FOUND]  ${dbPath} (${size} bytes)`);
        const db = new sqlite3.Database(dbPath);

                db.get("SELECT COUNT(*) as count FROM Customers", (err, row) => {
            if (err) {

                db.get("SELECT COUNT(*) as count FROM customers", (err2, row2) => {
                    db.close();
                    if (err2) {
                        console.log(`         -> Error reading tables: ${err2.message}`);
                        resolve(null);
                    } else {
                        console.log(`         -> Customers: ${row2.count}`);
                        resolve({ path: dbPath, count: row2.count });
                    }
                });
            } else {
                db.close();
                console.log(`         -> Customers: ${row.count}`);
                resolve({ path: dbPath, count: row.count });
            }
        });
    });
}

async function start() {
    let bestMatch = null;
    for (const p of possiblePaths) {
        const result = await auditFile(p);
        if (result && result.count > 0) {
            if (!bestMatch || result.count > bestMatch.count) {
                bestMatch = result;
            }
        }
    }

    if (bestMatch) {
        console.log('\n✅ ACTIVE DATABASE IDENTIFIED:');
        console.log(bestMatch.path);
        console.log(`Total Customers: ${bestMatch.count}`);


        runFullAudit(bestMatch.path);
    } else {
        console.log('\n❌ Could not find a database with customer data.');
        console.log('Ensure you have added at least one customer in the app.');
    }
}

function runFullAudit(dbPath) {
    const db = new sqlite3.Database(dbPath);
    const report = {
        path: dbPath,
        totalCustomers: 0,
        duplicatePhones: [],
        invalidPhoneLength: [],
        invalidNationalIdLength: [],
    };

    db.serialize(() => {

        const TABLE = 'Customers';

                db.get(`SELECT COUNT(*) as count FROM ${TABLE}`, (err, row) => {
            report.totalCustomers = row ? row.count : 0;
        });

        db.all(`
            SELECT phone, COUNT(*) as count, GROUP_CONCAT(_id) as ids 
            FROM ${TABLE} 
            GROUP BY phone 
            HAVING COUNT(*) > 1 AND phone IS NOT NULL AND phone != ''
        `, (err, rows) => { report.duplicatePhones = rows || []; });

        db.all(`
            SELECT _id, name, phone, length(phone) as len 
            FROM ${TABLE} 
            WHERE length(phone) != 11 AND phone IS NOT NULL AND phone != ''
        `, (err, rows) => { report.invalidPhoneLength = rows || []; });

        db.all(`
            SELECT _id, name, nationalId, length(nationalId) as len 
            FROM ${TABLE} 
            WHERE length(nationalId) != 14 AND nationalId IS NOT NULL AND nationalId != ''
        `, (err, rows) => { report.invalidNationalIdLength = rows || []; });

        setTimeout(() => {
            console.log('\n--- DETAILED AUDIT REPORT ---');
            console.log(JSON.stringify(report, null, 2));
            fs.writeFileSync('audit_report.json', JSON.stringify(report, null, 2));
            db.close();
        }, 1000);
    });
}

start();
