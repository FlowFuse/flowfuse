/* eslint-disable no-unused-vars */
/**
 * Add sso_enabled column to Users
 */

const { DataTypes, QueryInterface } = require('sequelize')

module.exports = {
    /**
   * upgrade database
   * @param {QueryInterface} context Sequelize.QueryInterface
   */
    up: async (context) => {
        await context.addColumn('Users', 'saml_groups', {
            type: DataTypes.STRING,
            defaultValue: ''
        })
    },
    down: async (context) => {}
}
