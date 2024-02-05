const { DataTypes } = require('sequelize')

module.exports = {
    up: async (context) => {
        await context.createTable('OAuthSessions', {
            id: {
                type: DataTypes.STRING,
                primaryKey: true
            },
            value: {
                type: DataTypes.TEXT,
                allowNull: false
            },
            createdAt: { type: DataTypes.DATE, allowNull: false },
            updatedAt: { type: DataTypes.DATE, allowNull: false }
        })
    },
    down: async (context) => {
    }
}
