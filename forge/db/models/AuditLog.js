/**
 * An Audit log entry
 * @namespace forge.db.models.AuditLog
 */

const { DataTypes } = require('sequelize');

module.exports = {
	name: "AuditLog",
  schema: {
    body: { type: DataTypes.STRING}
  },
  associations: function(M) {
    this.belongsTo(M['User']);
    this.belongsTo(M['Project']);
  }
}