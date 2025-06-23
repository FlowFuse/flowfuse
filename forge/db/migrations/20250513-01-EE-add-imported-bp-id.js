/**
 * Add imported ID to BluePrints
 */
const { DataTypes } = require('sequelize')

module.exports = {
    /**
     * upgrade database
     * @param {QueryInterface} context Sequelize.QueryInterface
     */
    up: async (context) => {
        await context.addColumn('FlowTemplates', 'importedId', {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: null
        })
    },
    down: async (context) => {
    }
}
