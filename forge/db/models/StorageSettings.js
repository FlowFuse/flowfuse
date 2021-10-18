/**
 * A Project's Settings
 * @namespce forge.db.models.StorageSettings
 */
const { DataTypes } = require('sequelize');

module.exports = {
  name: 'StorageSettings',
  schema: {
    settings: { type: DataTypes.STRING, allowNull: false, defaultValue: "{}"}
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
            attributes: ['id','settings']
          })
        }
      }
    }
  }
}