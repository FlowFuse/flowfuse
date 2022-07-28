/**
 * A Project's Credentials
 * @namespace forge.db.models.StorageCredentials
 */
const { DataTypes } = require('sequelize')

module.exports = {
    name: 'StorageCredentials',
    schema: {
        credentials: { type: DataTypes.TEXT, allowNull: false, defaultValue: '{}' }
    },
    associations: function (M) {
        this.belongsTo(M.Project)
    },
    finders: function (M) {
        return {
            static: {
                byProject: async (project) => {
                    return this.findOne({
                        where: { ProjectId: project },
                        attributes: ['id', 'credentials']
                    })
                }
            }
        }
    }
}
