const { DataTypes } = require('sequelize')

module.exports = {
    /**
     * upgrade database
     * @param {QueryInterface} context Sequelize.QueryInterface
     */
    up: async (context, Sequelize) => {
        await context.addColumn('Devices', 'nodejsVersion', {
            type: DataTypes.STRING,
            allowNull: true
        })
    },
    down: async (context, Squelize) => { }
}
