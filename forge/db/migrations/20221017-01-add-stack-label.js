/**
 * Add label to stack
 */

const { DataTypes } = require('sequelize')

module.exports = {
    up: async (context) => {
        await context.addColumn('ProjectStacks', 'label', {
            type: DataTypes.STRING
        })
    },
    down: async (context) => {
    }
}
