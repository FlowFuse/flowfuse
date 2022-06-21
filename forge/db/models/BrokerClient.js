const { DataTypes } = require('sequelize')
const { hash } = require('../utils')

module.exports = {
    name: 'BrokerClient',
    schema: {
        username: {
            type: DataTypes.STRING,
            primaryKey: true,
            allowNull: false
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false,
            set (value) {
                this.setDataValue('password', hash(value))
            }
        },
        ownerId: { type: DataTypes.STRING },
        ownerType: { type: DataTypes.STRING }
    }
}
