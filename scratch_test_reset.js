const path = require('path');
const systemController = require('./src/controllers/systemController');
const db = require('./src/models');

async function testReset() {
    const req = {
        body: { code: '124578' },
        ip: '127.0.0.1'
    };

        const res = {
        status: (code) => ({
            json: (data) => console.log(`[Status ${code}]`, data)
        })
    };

    console.log("Triggering Structural Reset...");
    await systemController.resetSystem(req, res);

        console.log("\nPost Reset State Check:");
    const [tables] = await db.sequelize.query("SELECT name FROM sqlite_master WHERE type='table'");
    console.log("Tables after reset:", tables.map(t => t.name).join(', '));
}

testReset();
