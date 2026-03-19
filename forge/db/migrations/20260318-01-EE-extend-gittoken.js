const { DataTypes } = require('sequelize')

module.exports = {
    /**
     * upgrade database
     * @param {QueryInterface} context Sequelize.QueryInterface
     */
    up: async (context, Sequelize) => {
        await context.addColumn('GitTokens', 'type', {
            type: DataTypes.STRING,
            defaultValue: 'github',
            allowNull: false
        })
    },
    down: async (context, Sequelize) => { }
}
