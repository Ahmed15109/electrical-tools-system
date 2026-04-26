const os = require('os');
const path = require('path');
const dbPath = path.join(os.homedir(), 'AppData/Roaming/system_app/database.db');


process.env.DATABASE_PATH = dbPath;

const db = require('./src/models');

async function diagnose() {
    console.log('--- 🛡️ Database Deep Diagnosis (Production Path) ---');
    console.log('Target:', dbPath);
    try {
        console.log('1. Authenticating...');
        await db.sequelize.authenticate();
        console.log('   ✅ Auth OK.');

        console.log('2. Attempting Sync (alter: true)...');

        await db.sequelize.sync({ alter: true, force: false });
        console.log('   ✅ Sync Completed (Unexpectedly? Check if schema actually matches).');

    } catch (error) {
        console.error('\n❌ SYNC FAILED');
        console.error('Error Name:', error.name);
        console.error('Error Message:', error.message);

        if (error.errors) {
            console.log('\n--- Detailed Validation Errors ---');
            error.errors.forEach((e, i) => {
                console.log(`Error [${i}]:`);
                console.log(`  - Type: ${e.type}`);
                console.log(`  - Path: ${e.path}`);
                console.log(`  - Value: ${e.value}`);
                console.log(`  - Message: ${e.message}`);
                console.log(`  - Origin: ${e.origin}`);
                if (e.validatorKey) console.log(`  - Key: ${e.validatorKey}`);
            });
        } else if (error.original) {
          console.error('\n--- Original SQL Error ---');
          console.error(error.original.message);
          if (error.sql) console.error('SQL:', error.sql);
        }
    } finally {
        await db.sequelize.close();
    }
}

diagnose();
