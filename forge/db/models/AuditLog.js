/**
 * An Audit log entry
 * @namespace forge.db.models.AuditLog
 */

const { DataTypes, Op } = require('sequelize')

module.exports = {
    name: 'AuditLog',
    schema: {
        event: { type: DataTypes.STRING },
        body: { type: DataTypes.TEXT },
        entityId: { type: DataTypes.STRING },
        entityType: { type: DataTypes.STRING }
    },
    options: {
        updatedAt: false
    },
    associations: function (M) {
        this.belongsTo(M.User)
        this.belongsTo(M.Project)//, { foreignKey: 'ownerId', constraints: false });
        this.belongsTo(M.Team, { foreignKey: 'ownerId', constraints: false })
    },
    finders: function (M) {
        return {
            static: {
                forProject: async (projectId, pagination = {}) => {
                    return M.AuditLog.forEntity('project', projectId, pagination)
                },
                forTeam: async (teamId, pagination = {}) => {
                    return M.AuditLog.forEntity('team', teamId, pagination)
                },
                forEntity: async (entityType, projectId, pagination = {}) => {
                    const limit = parseInt(pagination.limit) || 30
                    const where = {
                        entityId: projectId.toString(),
                        entityType: entityType
                    }
                    if (pagination.cursor) {
                        where.id = { [Op.lt]: M.AuditLog.decodeHashid(pagination.cursor) }
                    }
                    const entries = await this.findAll({
                        where,
                        order: [['createdAt', 'DESC']],
                        include: {
                            model: M.User,
                            attributes: ['username']
                        },
                        limit
                    })
                    return {
                        meta: {
                            next_cursor: entries.length === limit ? entries[entries.length - 1].hashid : undefined
                        },
                        log: entries
                    }
                }
            }
        }
    },
    meta: {
        slug: false,
        links: false
    }
}
