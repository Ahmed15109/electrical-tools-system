const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const os = require('os');










const dbPath = path.join(os.homedir(), 'AppData/Roaming/system_app/database.db');
const backupPath = `${dbPath}.bak.${Date.now()}`;


const db = new sqlite3.Database(dbPath);
const runSql = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve(this);
    });
});
const getSql = (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
    });
});

async function executeRecovery() {
    console.log('--- 🛡️ Production Database Recovery (v5) ---');
    console.log('Target:', dbPath);

    try {

        fs.copyFileSync(dbPath, backupPath);
        console.log('[1/6] Safety backup created at:', backupPath);


        console.log('[2/6] Initializing Atomic Transaction...');
        await runSql('PRAGMA foreign_keys = OFF');
        await runSql('BEGIN TRANSACTION');
        console.log('   ✅ Transaction started. Foreign Keys disabled.');



        await runSql(`
            CREATE TABLE Customers_new (
                _id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                phone TEXT UNIQUE,
                email TEXT UNIQUE,
                address TEXT,
                nationalId TEXT,
                notes TEXT,
                nationalIdImage TEXT,
                openingBalance FLOAT DEFAULT 0,
                createdAt DATETIME NOT NULL,
                updatedAt DATETIME NOT NULL
            )
        `);
        console.log('[3/6] Shadow table "Customers_new" created with UNIQUE constraints.');



        await runSql(`
            INSERT INTO Customers_new (
                _id, name, phone, email, address, nationalId, notes, nationalIdImage, openingBalance, createdAt, updatedAt
            )
            SELECT 
                _id, name, phone, 
                CASE WHEN email = '' OR email IS NULL THEN NULL ELSE email END,
                address, nationalId, notes, nationalIdImage, openingBalance, createdAt, updatedAt 
            FROM Customers
        `);
        console.log('[4/6] Data normalized and transferred to shadow table.');



        await runSql('ALTER TABLE Customers RENAME TO Customers_old');
        await runSql('ALTER TABLE Customers_new RENAME TO Customers');
        console.log('[5/6] Table swap (Rename) completed successfully.');


        await runSql('COMMIT');
        console.log('   ✅ Transaction committed.');

        console.log('[6/6] Running final integrity checks...');
        await runSql('PRAGMA foreign_keys = ON');
        const violation = await getSql('PRAGMA foreign_key_check');

                if (violation) {
            console.error('⚠️ ALERT: Relational inconsistency detected!', violation);
        } else {
            console.log('\n🌟 RECOVERY COMPLETE! System is now consistent.');
            console.log('   - Phone uniqueness: ACTIVE');
            console.log('   - Email uniqueness (safe NULLs): ACTIVE');
            console.log('   - Relational links: PRESERVED');
        }

    } catch (error) {
        console.error('\n❌ CRITICAL RECOVERY FAILURE:', error.message);
        console.log('   Starting Emergency Rollback...');
        try {
            await runSql('ROLLBACK');
            await runSql('PRAGMA foreign_keys = ON');
            console.log('   🛡️ Rollback successful. Database state preserved.');
        } catch (rollbackError) {
            console.error('   💀 Final Rollback failed. USE THE BACKUP FILE.', rollbackError.message);
        }
    } finally {
        db.close();
    }
}

executeRecovery();
