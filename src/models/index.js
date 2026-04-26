const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

const { resolveDbPath } = require('../config/dbPath');

const dbPath = resolveDbPath();


console.log('[DB PATH]:', dbPath);


const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: dbPath,
    logging: false
});

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;


db.Customer = require('./Customer')(sequelize, DataTypes);
db.Product = require('./Product')(sequelize, DataTypes);
db.Sale = require('./Sale')(sequelize, DataTypes);
db.Installment = require('./Installment')(sequelize, DataTypes);
db.Payment = require('./Payment')(sequelize, DataTypes);
db.SystemVault = require('./SystemVault')(sequelize, DataTypes);
db.Supplier = require('./Supplier')(sequelize, DataTypes);
db.Purchase = require('./Purchase')(sequelize, DataTypes);
db.PurchaseItem = require('./PurchaseItem')(sequelize, DataTypes);
db.SupplierPayment = require('./SupplierPayment')(sequelize, DataTypes);


db.Customer.hasMany(db.Sale, { foreignKey: 'customer', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
db.Sale.belongsTo(db.Customer, { foreignKey: 'customer', as: 'customerObj', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });

db.Customer.hasMany(db.Installment, { foreignKey: 'customer', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
db.Installment.belongsTo(db.Customer, { foreignKey: 'customer', as: 'customerObj', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });

db.Customer.hasMany(db.Payment, { foreignKey: 'customer', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
db.Payment.belongsTo(db.Customer, { foreignKey: 'customer', as: 'customerObj', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });

db.Sale.hasMany(db.Installment, { foreignKey: 'sale', as: 'installments', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
db.Installment.belongsTo(db.Sale, { foreignKey: 'sale', as: 'saleObj', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });

db.Sale.hasMany(db.Payment, { foreignKey: 'sale', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
db.Payment.belongsTo(db.Sale, { foreignKey: 'sale', as: 'saleObj', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });

db.Installment.hasMany(db.Payment, { foreignKey: 'installment', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
db.Payment.belongsTo(db.Installment, { foreignKey: 'installment', as: 'installmentObj', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });


db.Supplier.hasMany(db.Purchase, { foreignKey: 'supplier', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
db.Purchase.belongsTo(db.Supplier, { foreignKey: 'supplier', as: 'supplierObj', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });

db.Purchase.hasMany(db.PurchaseItem, { foreignKey: 'purchase', as: 'items', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
db.PurchaseItem.belongsTo(db.Purchase, { foreignKey: 'purchase', as: 'purchaseObj', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });

db.Product.hasMany(db.PurchaseItem, { foreignKey: 'product', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
db.PurchaseItem.belongsTo(db.Product, { foreignKey: 'product', as: 'productObj', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });

db.Supplier.hasMany(db.SupplierPayment, { foreignKey: 'supplier', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
db.SupplierPayment.belongsTo(db.Supplier, { foreignKey: 'supplier', as: 'supplierObj', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });

db.Purchase.hasMany(db.SupplierPayment, { foreignKey: 'purchase', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
db.SupplierPayment.belongsTo(db.Purchase, { foreignKey: 'purchase', as: 'purchaseObj', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });

module.exports = db;