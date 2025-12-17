const { DataTypes } = require('sequelize')

module.exports = {
    /**
     * upgrade database
     * @param {QueryInterface} context Sequelize.QueryInterface
     */
    up: async (context, Sequelize) => {
        await context.addColumn('MCPRegistrations', 'mcpName', {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: ''
        })
        await context.addColumn('MCPRegistrations', 'title', {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: ''
        })
        await context.addColumn('MCPRegistrations', 'version', {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: '1.0.0'
        })
        await context.addColumn('MCPRegistrations', 'description', {
            type: DataTypes.TEXT,
            allowNull: false,
            defaultValue: ''
        })
    },
    down: async (context, Sequelize) => { }
}
