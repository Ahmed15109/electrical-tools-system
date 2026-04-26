const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const os = require('os');

const dbPath = path.join(os.homedir(), 'AppData/Roaming/system_app/database.db');
const db = new sqlite3.Database(dbPath);

console.log('--- 🛡️ Migration: Safeguarded Phone Uniqueness ---');
console.log('Target:', dbPath);

db.serialize(() => {

    console.log('[1/4] Running mandatory pre-checks...');

    const checks = {
        duplicates: [],
        invalidLength: []
    };


    db.all(`
        SELECT phone, COUNT(*) as count 
        FROM Customers 
        WHERE phone IS NOT NULL AND phone != '' 
        GROUP BY phone 
        HAVING COUNT(*) > 1
    `, (err, rows) => {
        if (err) throw err;
        checks.duplicates = rows || [];
    });


    db.all(`
        SELECT name, phone 
        FROM Customers 
        WHERE (length(phone) != 11 AND phone IS NOT NULL AND phone != '')
    `, (err, rows) => {
        if (err) throw err;
        checks.invalidLength = rows || [];
    });


    db.get('SELECT 1', () => {
        if (checks.duplicates.length > 0) {
            console.error('\n❌ ABORTING: Duplicate phone numbers found:');
            checks.duplicates.forEach(d => console.error(`   - ${d.phone} (${d.count} occurrences)`));
            process.exit(1);
        }

        if (checks.invalidLength.length > 0) {
            console.error('\n❌ ABORTING: Invalid phone number formats found:');
            checks.invalidLength.forEach(i => console.error(`   - ${i.name}: ${i.phone}`));
            process.exit(1);
        }

        console.log('   ✅ Pre-check passed: No duplicates or format issues found.');
        runMigration();
    });
});

function runMigration() {
    console.log('[2/4] Initializing Transaction...');

        db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        db.run('PRAGMA foreign_keys = OFF'); 

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
            console.log('   Shadow table "Customers_new" created.');


            db.run(`
                INSERT INTO Customers_new (_id, name, phone, nationalId, nationalIdImage, address, email, notes, openingBalance, createdAt, updatedAt)
                SELECT _id, name, phone, nationalId, nationalIdImage, address, email, notes, openingBalance, createdAt, updatedAt FROM Customers
            `);
            console.log('   Data transfer completed.');


            db.run('DROP TABLE Customers');
            db.run('ALTER TABLE Customers_new RENAME TO Customers');
            console.log('   Table swap complete.');


            db.run('COMMIT', (err) => {
                if (err) {
                    console.error('❌ MIGRATION FAILED during COMMIT:', err.message);
                    db.run('ROLLBACK');
                } else {
                    console.log('\n✅ [4/4] MIGRATION SUCCESSFUL! Phone uniqueness enforced.');
                    console.log('   Verifying integrity...');

                                        db.run('PRAGMA foreign_keys = ON');
                    db.get('PRAGMA foreign_key_check', (err, row) => {
                        if (row) console.error('   ⚠️ Warning: Relation inconsistencies detected!', row);
                        else console.log('   🛡️  Reference integrity verified.');
                        db.close();
                    });
                }
            });

        } catch (error) {
            console.error('❌ MIGRATION FAILED:', error.message);
            db.run('ROLLBACK');
            db.run('PRAGMA foreign_keys = ON');
            db.close();
        }
    });
}
