module.exports = (sequelize, DataTypes) => {
    const Product = sequelize.define('Product', {
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
        brand: {
            type: DataTypes.STRING,
            defaultValue: 'General'
        },
        category: {
            type: DataTypes.STRING,
            defaultValue: 'General'
        },
        price: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        stock: {
            type: DataTypes.INTEGER,
            defaultValue: 10
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    }, {
        timestamps: true
    });

    return Product;
};
