const { Sequelize } = require('sequelize');
const dbPath = 'C:\\Users\\Ahmed\\AppData\\Roaming\\system_app\\database.db';
const sequelize = new Sequelize({ dialect: 'sqlite', storage: dbPath, logging: false });

async function check() {
    const [result] = await sequelize.query("SELECT sql FROM sqlite_master WHERE type='table' AND name IN ('Payments', 'Sales', 'Installments')");
    console.log(result.map(r => r.sql).join('\n\n'));
}
check();
