/* eslint-disable no-unused-vars */
/**
 * Add sso_enabled column to Users
 */

const { DataTypes, QueryInterface } = require("sequelize");

module.exports = {
  /**
   * upgrade database
   * @param {QueryInterface} context Sequelize.QueryInterface
   */
  up: async (context) => {
    await context.addColumn("SAMLProviders", "allowAllSSO", {
      type: DataTypes.BOOLEAN, 
      defaultValue: ''
    })
    await context.addColumn("SAMLProviders", "samlUserGroup", {
      type: DataTypes.STRING, 
      defaultValue: ''
    })
    await context.addColumn("SAMLProviders", "samlAdminGroup", {
      type: DataTypes.STRING, 
      defaultValue: ''
    })    

  },
  down: async (context) => {},
};