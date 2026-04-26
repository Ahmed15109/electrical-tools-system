const db = require('../models');

const initDatabase = async () => {
    try {
        console.log(`[DB Init] Authenticating SQLite database...`);
        await db.sequelize.authenticate();
        console.log(`[DB Init] Authentication successful.`);

                let isDev = true;
        try {
            const { app } = require('electron');
            if (app && app.isPackaged) isDev = false;
        } catch { }

        console.log(`[DB Init] Synchronizing models (isDev: ${isDev})...`);


        const { runMigrations } = require('./migrations');
        await runMigrations();





        await db.sequelize.sync({ alter: false, force: false }); 


        console.log(`[DB Init] Running periodic VACUUM optimizing offline SQLite sizes...`);
        await db.sequelize.query('PRAGMA vacuum;');

        console.log(`[DB Init] Models synchronized successfully.`);
        return { success: true };
    } catch (error) {
        console.error(`[DB Init Error] Failed to initialize the database.`);
        console.error(`[DB Init Error Details] Name: ${error.name}, Message: ${error.message}`);

                if (error.name === 'SequelizeValidationError' || (error.message && error.message.includes('Validation error'))) {
             console.error(`[DB Init Tip] This validation error usually happens when 'alter: true' tries to apply a strict schema constraint ` + 
                           `(like allowNull: false) to existing data that violates the rule. Or it's a model-level validation during sync.`);
        }

                throw error; 
    }
};

module.exports = initDatabase;
