/**
 * Add refreshToken to AccessToken
 */

const { DataTypes } = require('sequelize')

module.exports = {
    up: async (context) => {
        await context.addColumn('AccessTokens', 'refreshToken', {
            type: DataTypes.STRING
        })
    },
    down: async (context) => {
    }
}
