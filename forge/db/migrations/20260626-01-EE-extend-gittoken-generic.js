const { DataTypes } = require('sequelize')

module.exports = {
    /**
     * upgrade database
     * @param {QueryInterface} context Sequelize.QueryInterface
     */
    up: async (context, Sequelize) => {
        await context.addColumn('GitTokens', 'username', {
            type: DataTypes.STRING,
            allowNull: true
        })
        await context.addColumn('GitTokens', 'caCertificate', {
            type: DataTypes.TEXT,
            allowNull: true
        })
    },
    down: async (context, Sequelize) => { }
}
