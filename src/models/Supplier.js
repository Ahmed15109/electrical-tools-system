module.exports = (sequelize, DataTypes) => {
    const Supplier = sequelize.define('Supplier', {
        _id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: { notEmpty: true }
        },
        phone: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: { notEmpty: true }
        },

        cachedBalance: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        }
    }, {
        timestamps: true,
        indexes: [
            { fields: ['name'] }
        ]
    });

    return Supplier;
};
