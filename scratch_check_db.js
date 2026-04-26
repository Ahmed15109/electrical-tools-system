const path = require('path');
const db = require('./src/models/index');

async function check() {
    try {
        console.log("Checking DB...");

                const saleCount = await db.Sale.count();
        const payments = await db.Payment.count();

                console.log({
            sales: saleCount,
            payments: payments
        });


        const [integrityResult] = await db.sequelize.query('PRAGMA foreign_key_check;');
        console.log("FK check:", integrityResult);

            } catch(err) {
        console.error(err);
    }
}
check();
