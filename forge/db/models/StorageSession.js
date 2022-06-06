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
                    const allStorageSessions = await this.findAll({
                        where: {
                            sessions: {
                                [Op.like]: '%"' + username + '"%'
                            }
                        },
                        attributes: ['sessions', 'ProjectId']
                    })
                    return allStorageSessions.map(m => {
                        const session = m.sessions ? JSON.parse(m.sessions) : {}
                        const sessions = Object.values(session) || []
                        const usersSessions = sessions.filter(e => e.user === username && e.client === 'node-red-editor')
                        return { ProjectId: m.ProjectId, sessions: usersSessions }
                    }).filter(m => m.sessions.length > 0 && M.ProjectId)
                }
            }
        }
    }
}
