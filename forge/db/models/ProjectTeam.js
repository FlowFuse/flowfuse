/**
 * A Instance
 * @namespace forge.db.models.ProjectTeam
 */
const { DataTypes } = require('sequelize');

module.exports = {
	name: 'ProjectTeam',
	schema: {},
	options: {
		timestamps: false
	},
	associations:function(M) {
        this.belongsTo(M['Project']);
        this.belongsTo(M['Team']);
    }
}