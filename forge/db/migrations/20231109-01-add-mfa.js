const { DataTypes } = require('sequelize')

module.exports = {
    up: async (context) => {
        await context.addColumn('Sessions', 'mfa_verified', {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        })
        await context.addColumn('Users', 'mfa_enabled', {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        })
    },
    down: async (context) => {
    }
}
