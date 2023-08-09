/**
 * Add name to AccessToken
 */
const { DataTypes } = require('sequelize')

module.exports = {
    up: async (context) => {
        const dialect = context.sequelize.options.dialect

        await context.addColumn('AccessTokens', 'name', {
            type: DataTypes.STRING
        })
    },
    down: async (context) => {
    }
}
