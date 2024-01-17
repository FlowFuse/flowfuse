/**
 * A Project's Session
 * @namespace forge.db.models.StorageSession
 */
const { DataTypes, Op } = require('sequelize')

module.exports = {
    name: 'StorageSession',
    schema: {
        sessions: { type: DataTypes.TEXT, allowNull: false, defaultValue: '{}' }
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
                        attributes: ['id', 'sessions']
                    })
                },
                byUsername: async (username) => {
                    return this.findAll({
                        where: {
                            sessions: {
                                [Op.like]: '%"' + username + '"%'
                            }
                        },
                        attributes: ['id', 'sessions', 'ProjectId']
                    })
                }
            }
        }
    }
}
