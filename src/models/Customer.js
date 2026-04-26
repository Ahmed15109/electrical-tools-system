module.exports = (sequelize, DataTypes) => {
    const Customer = sequelize.define('Customer', {
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
        email: {
            type: DataTypes.STRING,
            allowNull: true,
            unique: true,
            validate: { isEmail: true }
        },
        phone: {
            type: DataTypes.STRING,
            allowNull: true,
            validate: {
                optionalPhone(value) {
                    if (value !== null && value !== undefined && value !== '') {
                        if (!/^\d{11}$/.test(value)) {
                            throw new Error('\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062a\u0641 \u064a\u062c\u0628 \u0623\u0646 \u064a\u0643\u0648\u0646 11 \u0631\u0642\u0645\u0627\u064b \u0635\u062d\u064a\u062d\u0627\u064b \u0628\u0627\u0644\u0636\u0628\u0637');
                        }
                    }
                }
            }
        },
        address: {
            type: DataTypes.STRING,
            allowNull: true
        },
        nationalId: {
            type: DataTypes.STRING(14),
            allowNull: true
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        nationalIdImage: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        openingBalance: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        }
    }, {
        timestamps: true,
        indexes: [
            { fields: ['name'] },
            { fields: ['nationalId'] }
        ]
    });

    return Customer;
};
