module.exports = (sequelize, DataTypes) => {
    const SystemVault = sequelize.define('SystemVault', {
        _id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        totalCashBalance: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        identifier: {
            type: DataTypes.STRING,
            defaultValue: 'main_vault',
            unique: true
        }
    }, {
        timestamps: true
    });

    return SystemVault;
};
