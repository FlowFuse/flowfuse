/**
 * A Project's Library
 * @namespce forge.db.models.StorageLibrary
 */
const { DataTypes } = require('sequelize');

module.exports = {
	name: 'StorageLibrary',
  schema: {
    name: { type: DataTypes.TEXT, allowNull: false},
    type: { type: DataTypes.TEXT, allowNull: false},
    meta: { type: DataTypes.TEXT, allowNull: true },
    body: { type: DataTypes.TEXT, allowNull: false, defaultValue: ""}
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
        },
        byName: async(project, type, name) => {
          return this.findOne({
            where: {ProjectId: project, type: type, name: name}
          })
        }
      }
    }
  }
}