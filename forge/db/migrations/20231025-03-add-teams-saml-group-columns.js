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
    await context.addColumn("Teams", "samlGroupOwner", {
      type: DataTypes.STRING,
      defaultValue: ""
    })

    await context.addColumn("Teams", "samlGroupMember", {
      type: DataTypes.STRING,
      defaultValue: ""
    })

    await context.addColumn("Teams", "samlGroupViewer", {
      type: DataTypes.STRING,
      defaultValue: ""
    })

    await context.addColumn("Teams", "samlGroupDashboard", {
      type: DataTypes.STRING,
      defaultValue: ""
    })

  },
  down: async (context) => {},
};
