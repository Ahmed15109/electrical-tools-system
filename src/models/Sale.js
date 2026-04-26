module.exports = (sequelize, DataTypes) => {
    const Sale = sequelize.define('Sale', {
        _id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        customer: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Customers',
                key: '_id'
            }
        },
        products: {
            type: DataTypes.JSON, 
            allowNull: false,
            defaultValue: []
        },
        totalPrice: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        interestRate: {
            type: DataTypes.INTEGER, // Basis points (1250 = 12.5%)
            defaultValue: 0
        },
        interestAmount: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        finalAmount: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        downPayment: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        remainingAmount: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        monthlyInstallment: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        durationMonths: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        paymentMethod: {
            type: DataTypes.ENUM('cash', 'installment', 'card'),
            allowNull: false
        },
        saleDate: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        status: {
            type: DataTypes.ENUM('active', 'cancelled'),
            defaultValue: 'active'
        }
    }, {
        timestamps: true,
        indexes: [
            {
                name: 'idx_sales_saleDate',
                fields: ['saleDate']
            }
        ]
    });

    return Sale;
};
