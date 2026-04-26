module.exports = (sequelize, DataTypes) => {
    const SupplierPayment = sequelize.define('SupplierPayment', {
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
        purchase: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'Purchases',
                key: '_id'
            }
        },
        amount: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: { min: 1 }
        },
        description: {
            type: DataTypes.STRING,
            defaultValue: 'دفعة للمورد'
        },
        paymentDate: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        }
    }, {
        timestamps: true,
        indexes: [
            { fields: ['supplier'] },
            { fields: ['purchase'] }
        ]
    });

    return SupplierPayment;
};
