/**
 * A Instance
 * @namespace forge.db.models.InstanceTeam
 */
const { DataTypes } = require('sequelize');

module.exports = {
	name: 'InstanceTeam',
	schema: {},
	options: {
		timestamps: false
	},
	associations:function(M) {
        this.belongsTo(M['Instance']);
        this.belongsTo(M['Team']);
    }
}