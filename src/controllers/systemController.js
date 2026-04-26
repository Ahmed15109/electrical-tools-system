const db = require('../models');
require('dotenv').config();

const RESET_SECRET = process.env.RESET_SECRET || '124578';

exports.resetSystem = async (req, res) => {
    const { code } = req.body;

    if (!code || String(code).trim() !== RESET_SECRET) {
        console.warn(`[System Reset] REFUSED — bad code from ${req.ip}`);
        return res.status(403).json({
            success: false,
            message: 'رمز التأكيد غير صحيح. تم رفض الطلب.'
        });
    }

    try {
        console.log('[System Reset] Accepted — FULL STRUCTURAL RESET initiating...');


        await db.sequelize.query('PRAGMA foreign_keys = OFF;');


        const [tables] = await db.sequelize.query("SELECT name FROM sqlite_master WHERE type='table'");


        for (const tableObj of tables) {
            const tableName = tableObj.name;

            if (!tableName.startsWith('sqlite_')) {
                console.log(`[System Reset] Dropping table: ${tableName}`);
                await db.sequelize.query(`DROP TABLE IF EXISTS "${tableName}";`);
            }
        }


        await db.sequelize.query('PRAGMA foreign_keys = ON;');


        console.log('[System Reset] Rebuilding schema from Sequelize models...');
        await db.sequelize.sync({ force: true });
        console.log('[System Reset] Database completely rebuilt & synchronized.');

        res.status(200).json({
            success: true,
            message: 'تم إعادة تعيين النظام بنجاح. تم مسح وبناء قاعدة البيانات من الصفر.',
            deleted: { structuralReset: true }
        });
    } catch (error) {
        console.error('[System Reset Error]', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};
