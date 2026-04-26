module.exports = (sequelize, DataTypes) => {
    const Purchase = sequelize.define('Purchase', {
        _id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        supplier: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Suppliers',
                key: '_id'
            }
        },
        totalAmount: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        paidAmount: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        remainingAmount: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        purchaseDate: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        }
    }, {
        timestamps: true,
        indexes: [
            { fields: ['purchaseDate'] },
            { fields: ['supplier'] }
        ]
    });

    return Purchase;
};
