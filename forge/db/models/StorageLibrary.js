/**
 * A Project's Library
 * @namespce forge.db.models.StorageLibrary
 */
const { DataTypes } = require('sequelize');

module.exports = {
	name: 'StorageLibrary',
  schema: {
    type: { type: DataTypes.STRING, allowNull: false},
    meta: { type: DataTypes.STRING, allowNull: true },
    body: { type: DataTypes.STRING, allowNull: false, defaultValue: ""}
  },
  associations: function(M) {
    this.belongsTo(M['Project']);
  },
  finders: function(M) {
    return {
      static: {
        byProject: async(project) => {
          return this.findAll({
            include: {
              model: M['Project'],
              where: { project: project },
              attributes: ["type", "meta", "body"]
            }
          })
        },
        byType: async(project, type) => {
          return this.findAll({
            where: {ProjectId: project, type: type}
          })
        }
      }
    }
  }
}