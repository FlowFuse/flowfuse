/**
 * This is an example migration that adds a column to the Users table
 */
const { DataTypes } = require('sequelize')

module.exports = {
    up: async (context) => {
        context.addColumn('Users', 'billing', {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        })
    },
    down: async (context) => {
        context.removeColumn('Users', 'billing')
    }
}
