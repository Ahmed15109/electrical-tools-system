const { Sequelize, DataTypes } = require('sequelize');
const dbPath = 'C:\\Users\\Ahmed\\AppData\\Roaming\\system_app\\database.db';
const sequelize = new Sequelize({ dialect: 'sqlite', storage: dbPath, logging: false });

async function check() {
    try {
        console.log("Checking actual Electron DB...");

                const [seq] = await sequelize.query("SELECT * FROM sqlite_sequence");
        console.log("sqlite_sequence:", seq);

                const [integrity] = await sequelize.query("PRAGMA foreign_key_check;");
        console.log("FK check:", integrity);

        const [tables] = await sequelize.query("SELECT name FROM sqlite_master WHERE type='table'");
        console.log("Tables:", tables.map(t => t.name).join(', '));

            } catch(err) {
        console.error(err);
    }
}
check();
