/* eslint-disable no-unused-vars */
/**
 * Add safeName column to Projects table
 */
const { DataTypes, QueryInterface } = require('sequelize')

module.exports = {
    /**
     * upgrade database
     * @param {QueryInterface} context Sequelize.QueryInterface
     */
    up: async (context) => {
        try {
            await context.addColumn('Projects', 'safeName', {
                type: DataTypes.STRING
                // allowNull: true
            })
            await context.sequelize.query('UPDATE Projects SET "safeName"=LOWER("name")')
            await context.changeColumn('Projects', 'safeName', {
                type: DataTypes.STRING,
                unique: true,
                allowNull: false
            })
        } catch (error) {
            context.removeColumn('Projects', 'safeName')
            throw error
        }
    },
    down: async (context) => {
    }
}
