const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const os = require('os');







const dbPath = path.join(os.homedir(), 'AppData/Roaming/system_app/database.db');
const backupPath = `${dbPath}.bak.${Date.now()}`;

console.log('--- Database Migration: Adding Unique Constraint ---');
console.log('Target:', dbPath);

if (!fs.existsSync(dbPath)) {
    console.error('Error: Database file not found.');
    process.exit(1);
}


fs.copyFileSync(dbPath, backupPath);
console.log(`[1/4] Backup created: ${backupPath}`);

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log('[2/4] Starting transaction...');
    db.run('BEGIN TRANSACTION');

    try {


        db.run(`
            CREATE TABLE Customers_new (
                _id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                phone TEXT UNIQUE,
                nationalId TEXT,
                nationalIdImage TEXT,
                address TEXT,
                email TEXT,
                notes TEXT,
                openingBalance FLOAT DEFAULT 0,
                createdAt DATETIME NOT NULL,
                updatedAt DATETIME NOT NULL
            )
        `);
        console.log('[3/4] Created shadow table "Customers_new" with UNIQUE constraint.');


        db.run(`
            INSERT INTO Customers_new (_id, name, phone, nationalId, nationalIdImage, address, email, notes, openingBalance, createdAt, updatedAt)
            SELECT _id, name, phone, nationalId, nationalIdImage, address, email, notes, openingBalance, createdAt, updatedAt FROM Customers
        `);
        console.log('[4/4] Data migrated successfully.');


        db.run('DROP TABLE Customers');
        db.run('ALTER TABLE Customers_new RENAME TO Customers');

                db.run('COMMIT', (err) => {
            if (err) throw err;
            console.log('\n✅ MIGRATION COMPLETE! Phone uniqueness enforced.');
            db.close();
        });

    } catch (error) {
        console.error('\n❌ MIGRATION FAILED:', error.message);
        db.run('ROLLBACK');
        db.close();
    }
});
