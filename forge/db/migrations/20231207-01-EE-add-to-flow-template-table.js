/* eslint-disable no-unused-vars */

const { DataTypes, QueryInterface } = require('sequelize')

module.exports = {
    /**
     * Add icon and order to FlowTemplate (renamed FlowBlueprints in the UI)
     * @param {QueryInterface} context Sequelize.QueryInterface
     */
    up: async (context) => {
        const tableExists = await context.tableExists('FlowTemplates')
        if (!tableExists) {
            return context.sequelize.log('Skipping FlowTemplates migration as table does not exist')
        }

        await context.addColumn('FlowTemplates', 'icon', {
            type: DataTypes.STRING,
            allowNull: true
        })
        await context.addColumn('FlowTemplates', 'order', {
            type: DataTypes.INTEGER,
            defaultValue: 0
        })
        await context.addColumn('FlowTemplates', 'default', {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        })
    },
    down: async (context) => {
    }
}
