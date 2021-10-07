/**
 * A Project's Session
 * @namespce forge.db.models.StorageSession
 */
const { DataTypes } = require('sequelize');

module.exports = {
	name: 'StorageSession',
  schema: {
    sessions: { type: DataTypes.STRING, allowNull: false, defaultValue: "{}"}
  },
  associations: function(M) {
    this.belongsTo(M['Project']);
  },
  finders: function(M) {
    return {
      static: {
        byProject: async(project) => {
          return this.findOne({
            where: {ProjectId: project},
            attributes: ['id','sessions']
          })
        }
      }
    }
  }
}