const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const os = require('os');





const dbPath = path.join(os.homedir(), 'AppData/Roaming/system_app/database.db');
const db = new sqlite3.Database(dbPath);

console.log('--- 🛡️ Migration: Safeguarded Phone Uniqueness (v4) ---');
console.log('Target:', dbPath);


const queryAll = (sql) => new Promise((resolve, reject) => {
    db.all(sql, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
    });
});

const executeSql = (sql) => new Promise((resolve, reject) => {
    db.run(sql, (err) => {
        if (err) reject(err);
        else resolve();
    });
});

async function runSafeMigration() {
    try {
        console.log('[1/4] Starting Async Pre-checks...');


        const [duplicates, invalidLength] = await Promise.all([
            queryAll(`
                SELECT phone, COUNT(*) as count 
                FROM Customers 
                WHERE phone IS NOT NULL AND phone != '' 
                GROUP BY phone 
                HAVING COUNT(*) > 1
            `),
            queryAll(`
                SELECT name, phone 
                FROM Customers 
                WHERE (length(phone) != 11 AND phone IS NOT NULL AND phone != '')
            `)
        ]);

        console.log('   ✅ Async checks completed.');


        if (duplicates.length > 0) {
            console.error('\n❌ ABORTING: Duplicate phone numbers found:');
            duplicates.forEach(d => console.error(`   - ${d.phone} (${d.count} occurrences)`));
            process.exit(1);
        }


        if (invalidLength.length > 0) {
            console.error('\n❌ ABORTING: Invalid phone number formats found (must be 11 digits):');
            invalidLength.forEach(i => console.error(`   - ${i.name}: ${i.phone}`));
            process.exit(1);
        }

        console.log('   ✅ Verification Passed: Data is clean and safe to migrate.');


        console.log('[2/4] Initializing Atomic Transaction...');
        await executeSql('BEGIN TRANSACTION');
        await executeSql('PRAGMA foreign_keys = OFF');
        console.log('   Transaction started. Foreign Keys disabled.');


        await executeSql(`
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


        await executeSql(`
            INSERT INTO Customers_new (_id, name, phone, nationalId, nationalIdImage, address, email, notes, openingBalance, createdAt, updatedAt)
            SELECT _id, name, phone, nationalId, nationalIdImage, address, email, notes, openingBalance, createdAt, updatedAt FROM Customers
        `);
        console.log('   Data transfer completed.');


        await executeSql('DROP TABLE Customers');
        await executeSql('ALTER TABLE Customers_new RENAME TO Customers');
        console.log('   Table swap complete.');


        await executeSql('COMMIT');
        console.log('\n✅ [3/4] MIGRATION SUCCESSFUL! Phone uniqueness enforced.');


        console.log('[4/4] Finalizing and re-enabling integrity checks...');
        await executeSql('PRAGMA foreign_keys = ON');
        const violations = await queryAll('PRAGMA foreign_key_check');

                if (violations.length > 0) {
            console.error('   ⚠️ Warning: Relation inconsistencies detected!', violations);
        } else {
            console.log('   🛡️  Reference integrity verified.');
        }

        db.close();

    } catch (error) {
        console.error('\n❌ CRITICAL ERROR IN MIGRATION:', error.message);
        try {
            await executeSql('ROLLBACK');
            console.log('   🛡️  Rollback successful. Database preserved in original state.');
        } catch (rollbackError) {
            console.error('   💀 Rollback FAILED:', rollbackError.message);
        }
        await executeSql('PRAGMA foreign_keys = ON');
        db.close();
    }
}


runSafeMigration();
