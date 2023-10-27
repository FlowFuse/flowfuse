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
    await context.addColumn("TeamMembers", "samlAdded", {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    });
  },
  down: async (context) => {},
};
