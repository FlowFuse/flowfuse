/**
 * A Instance
 * @namespace forge.db.models.Instance
 */
const { DataTypes } = require('sequelize');

module.exports = {
	name: 'Instance',
	schema: {
		id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4},
		name: { type: DataTypes.STRING, allowNull: false},
		type: { type: DataTypes.STRING, allowNull: false},
		url: { type: DataTypes.STRING, allowNull: false}
	},
	associations: function(M) {
		this.belongsToMany(M['Team'], { through: M['InstanceTeam']})
		this.hasMany(M['InstanceTeam'])
	}
}