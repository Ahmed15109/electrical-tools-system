module.exports = (sequelize, DataTypes) => {
    const PurchaseItem = sequelize.define('PurchaseItem', {
        _id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        purchase: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Purchases',
                key: '_id'
            }
        },
        product: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Products',
                key: '_id'
            }
        },
        quantity: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: { min: 1 }
        },
        costPrice: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: { min: 0 }
        }
    }, {
        timestamps: false,
        indexes: [
            { fields: ['purchase'] },
            { fields: ['product'] }
        ]
    });

    return PurchaseItem;
};
