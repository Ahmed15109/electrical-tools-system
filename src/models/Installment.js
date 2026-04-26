module.exports = (sequelize, DataTypes) => {
    const Installment = sequelize.define('Installment', {
        _id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        amount: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        paidAmount: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        remainingAmount: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        dueDate: {
            type: DataTypes.DATE,
            allowNull: false
        },
        status: {
            type: DataTypes.ENUM('pending', 'partial', 'paid'),
            defaultValue: 'pending'
        },
        paidAt: {
            type: DataTypes.DATE,
            allowNull: true
        }
    }, {
        timestamps: true
    });

    return Installment;
};
