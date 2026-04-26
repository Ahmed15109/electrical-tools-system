module.exports = (sequelize, DataTypes) => {
    const Payment = sequelize.define('Payment', {
        _id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        amount: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        type: {
            type: DataTypes.ENUM('in', 'out'),
            defaultValue: 'in'
        },
        source: {
            type: DataTypes.ENUM('sale', 'installment', 'expense', 'manual', 'refund', 'purchase', 'supplier_payment', 'sale_cancel'),
            defaultValue: 'manual'
        },
        description: {
            type: DataTypes.STRING,
            defaultValue: ''
        },
        paymentDate: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        paymentMethod: {
            type: DataTypes.ENUM('cash', 'card', 'bank_transfer'),
            defaultValue: 'cash'
        },
        reference: {
            type: DataTypes.STRING,
            allowNull: true
        },
        isDeleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        cancelledAt: {
            type: DataTypes.DATE,
            allowNull: true
        },
        cancelReason: {
            type: DataTypes.STRING,
            allowNull: true
        }
    }, {
        timestamps: true
    });

    return Payment;
};
