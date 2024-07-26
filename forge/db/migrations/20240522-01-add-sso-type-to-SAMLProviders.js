/**
 * Add type to SAMLProvides tables
 */
const { DataTypes } = require('sequelize')

module.exports = {
    /**
     * upgrade database
     * @param {QueryInterface} context Sequelize.QueryInterface
     */
    up: async (context) => {
        await context.addColumn('SAMLProviders', 'type', {
            type: DataTypes.ENUM(['saml', 'ldap']),
            defaultValue: 'saml'
        })
    },
    down: async (context) => {
    }
}
