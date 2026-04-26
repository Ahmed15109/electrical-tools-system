const db = require('../models');

async function runMigrations() {
    try {
        console.log(`[Migrations] Starting database migrations...`);
        const queryInterface = db.sequelize.getQueryInterface();
        const tables = await queryInterface.showAllTables();

        const tableName = 'Customers';
        if (!tables.includes(tableName)) {
            console.log(`[Migrations] Table '${tableName}' does not exist yet. Skipping migration.`);
        } else {
            const columnsData = await db.sequelize.query(`PRAGMA table_info(${tableName});`, {
                type: db.sequelize.QueryTypes.SELECT
            });
            const existingColumns = columnsData.map(c => c.name);

            const updates = {
                nationalId: 'TEXT',
                notes: 'TEXT',
                nationalIdImage: 'TEXT'
            };

            let migratedCount = 0;
            for (const [colName, colType] of Object.entries(updates)) {
                if (!existingColumns.includes(colName)) {
                    console.log(`[Migrations] Appending missing column '${colName}' to '${tableName}'...`);
                    await db.sequelize.query(`ALTER TABLE ${tableName} ADD COLUMN ${colName} ${colType};`);
                    migratedCount++;
                }
            }

            if (migratedCount === 0) {
                console.log(`[Migrations] No schema changes required for Customers. Database is up to date.`);
            } else {
                console.log(`[Migrations] Successfully migrated ${migratedCount} columns in Customers.`);
            }

            
            const phoneCol = columnsData.find(c => c.name === 'phone');
            if (phoneCol && phoneCol.notnull === 1) {
                console.log(`[Migrations] Customers.phone is NOT NULL — recreating table to make it optional...`);

            
                const q = (sql) => db.sequelize.query(sql);
                await q(`PRAGMA foreign_keys = OFF`);
                await q(`BEGIN`);
                try {
                    await q(`ALTER TABLE "Customers" RENAME TO "Customers_old"`);

                    await q(`
                        CREATE TABLE "Customers" (
                            "_id"             INTEGER PRIMARY KEY AUTOINCREMENT,
                            "name"            VARCHAR(255) NOT NULL,
                            "email"           VARCHAR(255) UNIQUE,
                            "phone"           VARCHAR(255),
                            "address"         VARCHAR(255),
                            "nationalId"      VARCHAR(14),
                            "notes"           TEXT,
                            "nationalIdImage" TEXT,
                            "openingBalance"  REAL DEFAULT 0,
                            "createdAt"       DATETIME NOT NULL,
                            "updatedAt"       DATETIME NOT NULL
                        )
                    `);

                    await q(`
                        INSERT INTO "Customers"
                            ("_id","name","email","phone","address","nationalId","notes","nationalIdImage","openingBalance","createdAt","updatedAt")
                        SELECT
                            "_id","name",
                            NULLIF(TRIM("email"), ''),
                            NULLIF(TRIM("phone"), ''),
                            "address","nationalId","notes","nationalIdImage","openingBalance","createdAt","updatedAt"
                        FROM "Customers_old"
                    `);

                    await q(`CREATE INDEX IF NOT EXISTS "customers_name"        ON "Customers" ("name")`);
                    await q(`CREATE INDEX IF NOT EXISTS "customers_national_id" ON "Customers" ("nationalId")`);
                    await q(`DROP TABLE "Customers_old"`);
                    await q(`COMMIT`);
                    console.log(`[Migrations] Customers.phone is now nullable. Migration complete.`);
                } catch (migErr) {
                    await q(`ROLLBACK`).catch(() => {});
                    throw migErr;
                } finally {
                    await q(`PRAGMA foreign_keys = ON`).catch(() => {});
                }
            }
        }

        const paymentsTable = 'Payments';
        if (!tables.includes(paymentsTable)) {
            console.log(`[Migrations] Table '${paymentsTable}' does not exist yet — will be created by sync.`);
        } else {
            const payColumnsData = await db.sequelize.query(`PRAGMA table_info(${paymentsTable});`, {
                type: db.sequelize.QueryTypes.SELECT
            });
            const payExistingCols = payColumnsData.map(c => c.name);

            const payUpdates = {
                isDeleted:    'INTEGER DEFAULT 0',
                cancelledAt:  'DATETIME',
                cancelReason: 'TEXT'
            };

            let payMigratedCount = 0;
            for (const [col, cType] of Object.entries(payUpdates)) {
                if (!payExistingCols.includes(col)) {
                    console.log(`[Migrations] Appending missing column '${col}' to '${paymentsTable}'...`);
                    await db.sequelize.query(`ALTER TABLE ${paymentsTable} ADD COLUMN ${col} ${cType};`);
                    payMigratedCount++;
                }
            }

            if (payMigratedCount > 0) {
                console.log(`[Migrations] Successfully migrated ${payMigratedCount} columns in Payments.`);
            } else {
                console.log(`[Migrations] No schema changes required for Payments. Database is up to date.`);
            }
        }

        /**
         * GLOBAL PRECISION REFACTOR: FLOAT -> INTEGER (Cents & BPS)
         * Multiplies money amounts by 100 and interestRate by 10000.
         */
        const precisionTables = [
            { name: 'Customers',       moneyCols: ['openingBalance'] },
            { name: 'Products',        moneyCols: ['price'] },
            { name: 'Sales',           moneyCols: ['totalPrice', 'interestAmount', 'finalAmount', 'downPayment', 'remainingAmount', 'monthlyInstallment'], rateCols: ['interestRate'] },
            { name: 'Installments',    moneyCols: ['amount'] },
            { name: 'Payments',        moneyCols: ['amount'] },
            { name: 'Purchases',       moneyCols: ['totalAmount', 'paidAmount', 'remainingAmount'] },
            { name: 'PurchaseItems',   moneyCols: ['costPrice'] },
            { name: 'Suppliers',       moneyCols: ['cachedBalance'] },
            { name: 'SupplierPayments',moneyCols: ['amount'] },
            { name: 'SystemVaults',    moneyCols: ['totalCashBalance'] }
        ];

        for (const tableDef of precisionTables) {
            if (!tables.includes(tableDef.name)) continue;

            const colData = await db.sequelize.query(`PRAGMA table_info("${tableDef.name}");`, { type: db.sequelize.QueryTypes.SELECT });
            
            // Check if any intended integer column is still REAL or FLOAT
            const needsMigration = colData.some(c => {
                const isMoney = tableDef.moneyCols.includes(c.name);
                const isRate = (tableDef.rateCols || []).includes(c.name);
                const type = c.type.toUpperCase();
                const isFloat = type === 'REAL' || type === 'FLOAT' || type.includes('DOUBLE') || type.includes('DECIMAL');
                
                if (isMoney || isRate) {
                    console.log(`[Migrations] Table ${tableDef.name} col ${c.name} type: ${type} (isFloat: ${isFloat})`);
                }
                
                return (isMoney || isRate) && isFloat;
            });

            if (needsMigration) {
                console.log(`[Migrations] Table '${tableDef.name}' has FLOAT/REAL financial columns. Migrating to INTEGER precision...`);
                
                const q = (sql) => db.sequelize.query(sql);
                await q(`PRAGMA foreign_keys = OFF`);
                try {
                    await q(`BEGIN TRANSACTION`);
                    
                    // 1. Rename old
                    await q(`ALTER TABLE "${tableDef.name}" RENAME TO "${tableDef.name}_old"`);
                    
                    // 2. Create new (definitions must match models exactly)
                    // We'll use a dynamic strategy here: copy the old schema but change FLOAT to INTEGER
                    const createSqlRes = await db.sequelize.query(`SELECT sql FROM sqlite_master WHERE type='table' AND name='${tableDef.name}_old'`, { type: db.sequelize.QueryTypes.SELECT });
                    let createSql = createSqlRes[0].sql;
                    createSql = createSql.replace(`CREATE TABLE "${tableDef.name}_old"`, `CREATE TABLE "${tableDef.name}"`);
                    createSql = createSql.replace(`CREATE TABLE ${tableDef.name}_old`, `CREATE TABLE "${tableDef.name}"`); // fallback for no quotes
                    
                    // Replace FLOAT/REAL with INTEGER for the specified columns
                    for (const mCol of tableDef.moneyCols) {
                        const regex = new RegExp(`("${mCol}"|${mCol})\\s+(REAL|FLOAT)`, 'gi');
                        createSql = createSql.replace(regex, `$1 INTEGER`);
                    }
                    if (tableDef.rateCols) {
                        for (const rCol of tableDef.rateCols) {
                            const regex = new RegExp(`("${rCol}"|${rCol})\\s+(REAL|FLOAT)`, 'gi');
                            createSql = createSql.replace(regex, `$1 INTEGER`);
                        }
                    }
                    
                    await q(createSql);

                    const allCols = colData.map(c => `"${c.name}"`);
                    const selectCols = colData.map(c => {
                        const isMoney = tableDef.moneyCols.includes(c.name);
                        const isRate = (tableDef.rateCols || []).includes(c.name);
                        const type = c.type.toUpperCase();
                        const isFloat = type === 'REAL' || type === 'FLOAT' || type.includes('DOUBLE') || type.includes('DECIMAL');

                        if (isMoney && isFloat) {
                            return `CAST(ROUND("${c.name}" * 100) AS INTEGER)`;
                        }
                        if (isRate && isFloat) {
                            return `CAST(ROUND("${c.name}" * 10000) AS INTEGER)`;
                        }
                        return `"${c.name}"`;
                    });

                    await q(`INSERT INTO "${tableDef.name}" (${allCols.join(',')}) SELECT ${selectCols.join(',')} FROM "${tableDef.name}_old"`);

                    // 4. Cleanup
                    await q(`DROP TABLE "${tableDef.name}_old"`);
                    await q(`COMMIT`);
                    console.log(`[Migrations] Table '${tableDef.name}' successfully migrated to integer precision.`);
                } catch (err) {
                    await q(`ROLLBACK`).catch(() => {});
                    console.error(`[Migrations] FATAL ERROR during precision migration of ${tableDef.name}:`, err);
                    throw err;
                } finally {
                    await q(`PRAGMA foreign_keys = ON`).catch(() => {});
                }
            }
        }

    } catch (error) {
        console.error(`[Migrations Error] Failed to execute safe migrations.`, error);
        throw error;
    }
}

module.exports = { runMigrations };

