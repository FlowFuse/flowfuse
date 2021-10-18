/**
 * A Project's Credentials
 * @namespce forge.db.models.StorageCredentials
 */
const { DataTypes } = require('sequelize');

module.exports = {
  name: 'StorageCredentials',
  schema: {
    credentials: { type: DataTypes.STRING, allowNull: false, defaultValue: "{}"}
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
            attributes: ['id','credentials']
          })
        }
      }
    }
  }
}