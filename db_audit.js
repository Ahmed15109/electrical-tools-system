const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const os = require('os');







const dbPath = path.join(os.homedir(), 'AppData/Roaming/system_app/database.db');

console.log('--- Database Integrity Audit (Migration Readiness) ---');
console.log('Target:', dbPath);

if (!fs.existsSync(dbPath)) {
    console.error(`Error: database.db not found at ${dbPath}`);
    process.exit(1);
}

const db = new sqlite3.Database(dbPath);

const report = {
    totalCustomers: 0,
    duplicatePhones: [],
    invalidPhoneLength: [], 
    invalidNationalIdLength: [], 
    nonNumericData: [],
    timestamp: new Date().toISOString()
};

db.serialize(() => {
    const TABLE = 'Customers';


    db.get(`SELECT COUNT(*) as count FROM ${TABLE}`, (err, row) => {
        if (err) return console.error('Error counting customers:', err.message);
        report.totalCustomers = row ? row.count : 0;
    });


    db.all(`
        SELECT phone, COUNT(*) as count, GROUP_CONCAT(_id) as ids 
        FROM ${TABLE} 
        WHERE phone IS NOT NULL AND phone != '' 
        GROUP BY phone 
        HAVING COUNT(*) > 1
    `, (err, rows) => {
        if (err) return console.error('Error finding duplicate phones:', err.message);
        report.duplicatePhones = rows || [];
    });


    db.all(`
        SELECT _id, name, phone, length(phone) as len 
        FROM ${TABLE} 
        WHERE length(phone) != 11 AND phone IS NOT NULL AND phone != ''
    `, (err, rows) => {
        if (err) return console.error('Error checking phone lengths:', err.message);
        report.invalidPhoneLength = rows || [];
    });


    db.all(`
        SELECT _id, name, nationalId, length(nationalId) as len 
        FROM ${TABLE} 
        WHERE length(nationalId) != 14 AND nationalId IS NOT NULL AND nationalId != ''
    `, (err, rows) => {
        if (err) return console.error('Error checking ID lengths:', err.message);
        report.invalidNationalIdLength = rows || [];
    });


    db.all(`
        SELECT _id, name, phone, nationalId 
        FROM ${TABLE} 
        WHERE (phone GLOB '*[^0-9]*') OR (nationalId GLOB '*[^0-9]*')
    `, (err, rows) => {
        if (err) return console.error('Error checking numeric formats:', err.message);
        report.nonNumericData = rows || [];
    });
});

setTimeout(() => {
    console.log('\n--- AUDIT REPORT SUMMARY ---');
    console.log('Total Customers:', report.totalCustomers);
    console.log('Duplicate Phones found:', report.duplicatePhones.length);
    if (report.duplicatePhones.length > 0) {
        console.log('  ⚠️ WARNING: You must fix duplicates before we can apply the UNIQUE constraint.');
    }
    console.log('Invalid Phone lengths (not 11):', report.invalidPhoneLength.length);
    console.log('Invalid National ID lengths (not 14):', report.invalidNationalIdLength.length);
    console.log('Non-numeric characters found:', report.nonNumericData.length);

        const reportPath = path.join(process.cwd(), 'audit_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log('\nDetailed compliance report saved to:', reportPath);

        db.close();
}, 2000);
