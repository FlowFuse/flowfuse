/**
 * Add readOnly and adminOptIn columns to AccessTokens
 */

const { DataTypes } = require('sequelize')

module.exports = {
    /**
     * upgrade database
     * @param {QueryInterface} context Sequelize.QueryInterface
     */
    up: async (context, Sequelize) => {
        await context.addColumn('AccessTokens', 'readOnly', {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false
        })
        await context.addColumn('AccessTokens', 'adminOptIn', {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false
        })
    },
    down: async (context) => {}
}
