/**
 * An Audit log entry
 * @namespace forge.db.models.AuditLog
 */

const { DataTypes, Op } = require('sequelize')

const { buildPaginationSearchClause } = require('../utils')

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
                forPlatform: async (pagination = {}) => {
                    const where = {
                        [Op.or]: [{ entityType: 'platform' }, { entityType: 'user' }]
                    }
                    return M.AuditLog.forEntity(where, pagination)
                },
                forProject: async (projectId, pagination = {}) => {
                    const where = {
                        entityId: projectId.toString(),
                        entityType: 'project'
                    }
                    return M.AuditLog.forEntity(where, pagination)
                },
                forTeam: async (teamId, pagination = {}) => {
                    const where = {
                        entityId: teamId.toString(),
                        entityType: 'team'
                    }
                    return M.AuditLog.forEntity(where, pagination)
                },
                forApplication: async (applicationId, pagination = {}) => {
                    const where = {
                        entityId: applicationId.toString(),
                        entityType: 'application'
                    }
                    return M.AuditLog.forEntity(where, pagination)
                },
                forDevice: async (deviceId, pagination = {}) => {
                    const where = {
                        entityId: deviceId.toString(),
                        entityType: 'device'
                    }
                    return M.AuditLog.forEntity(where, pagination)
                },
                forEntity: async (where = {}, pagination = {}) => {
                    const limit = parseInt(pagination.limit) || 1000
                    if (pagination.cursor) {
                        // As we aren't using the default cursor behaviour (Op.gt)
                        // set the appropriate clause and delete cursor so that
                        // buildPaginationSearchClause doesn't do it for us
                        where.id = { [Op.lt]: M.AuditLog.decodeHashid(pagination.cursor) }
                        delete pagination.cursor
                    }
                    const { count, rows } = await this.findAndCountAll({
                        where: buildPaginationSearchClause(
                            pagination,
                            where,
                            // These are the columns that are searched using the `query` query param
                            ['AuditLog.event', 'AuditLog.body', 'User.username', 'User.name'],
                            // These map additional query params to specific columns to allow filtering
                            {
                                event: 'AuditLog.event',
                                username: 'User.username'
                            }
                        ),
                        order: [['createdAt', 'DESC']],
                        include: {
                            model: M.User,
                            attributes: ['id', 'hashid', 'username']
                        },
                        limit
                    })

                    return {
                        meta: {
                            next_cursor: rows.length === limit ? rows[rows.length - 1].hashid : undefined
                        },
                        count,
                        log: rows
                    }
                },
                forProjectHistory: async (projectId, pagination = {}) => {
                    // Premise:
                    //  we want to generate a timeline of events for a project, including snapshots
                    //  so that user can see "things that changed" the project and any immediate snapshots.
                    // Approach:
                    //  1. Get all log entries for the project starting from the pagination cursor & limited by the pagination limit
                    //     where they meet the criteria for project history (see Op.in filter below)
                    //  2. If the log entry has a snapshot, try to find the actual snapshot object and replace the body with it
                    //     This gives updates any stale snapshot references in the log entries
                    //     Additionally, flag snapshot existence in the info object as { snapshotExists: true/false }
                    //     (The info object is a permitted field in the audit log entry body)
                    // 3. Return the log entries as { meta: Object, count: Number, timeline: Array<Object> }

                    const limit = parseInt(pagination.limit) || 100
                    const where = {
                        entityId: projectId,
                        entityType: 'project',
                        event: {
                            [Op.in]: [
                                'project.created',
                                'project.deleted',
                                'flows.set', // flows deployed by user
                                'project.settings.updated',
                                'project.snapshot.created', // snapshot created manually or automatically
                                'project.snapshot.rolled-back', // snapshot rolled back by user
                                'project.snapshot.imported' // result of a pipeline deployment
                            ]
                        }
                    }
                    const result = {
                        meta: {},
                        count: 0,
                        timeline: []
                    }

                    //  1. Get log entries
                    if (pagination.cursor) {
                        // As we aren't using the default cursor behaviour (Op.gt)
                        // set the appropriate clause and delete cursor so that
                        // buildPaginationSearchClause doesn't do it for us
                        where.id = { [Op.lt]: M.AuditLog.decodeHashid(pagination.cursor) }
                        delete pagination.cursor
                    }
                    const rows = await this.findAll({
                        where: buildPaginationSearchClause(
                            pagination,
                            where,
                            // These are the columns that are searched using the `query` query param
                            ['AuditLog.event', 'AuditLog.body', 'User.username', 'User.name'],
                            // These map additional query params to specific columns to allow filtering
                            {
                                event: 'AuditLog.event',
                                username: 'User.username'
                            }
                        ),
                        order: [['createdAt', 'DESC']],
                        include: {
                            model: M.User,
                            attributes: ['id', 'hashid', 'username', 'name', 'avatar']
                        },
                        limit
                    })

                    // guard: no log entries (no need to process further)
                    if (!rows || !rows.length) {
                        return result
                    }

                    // 2. convert body string and grab snapshot if available
                    for (const entry of rows) {
                        try {
                            entry.body = ((typeof entry.body || '{}') === 'string' ? JSON.parse(entry.body) : entry.body) || {}
                            // since we are in the context of a project history, we don't need to include the project object (redundant)
                            delete entry.body.project
                            // update snapshot if available and flag existence
                            if (entry.body.snapshot) {
                                if (typeof entry.body.info !== 'object') {
                                    entry.body.info = entry.body.info ? { _info: entry.body.info } : {}
                                }
                                if (entry.body.snapshot) {
                                    const snapshot = await M.ProjectSnapshot.byId(entry.body.snapshot.id)
                                    if (snapshot) {
                                        entry.body.snapshot = snapshot
                                        entry.body.info = { snapshotExists: true }
                                    } else {
                                        entry.body.info = { snapshotExists: false }
                                    }
                                } else {
                                    entry.body.info = { snapshotExists: false }
                                }
                            }
                        } catch (_e) {
                            // do nothing
                        }
                    }

                    // 3. Return the log entries
                    result.meta.next_cursor = rows.length < limit ? undefined : rows[rows.length - 1].hashid
                    result.count = rows.length
                    result.timeline = rows
                    return result
                }
            }
        }
    },
    meta: {
        slug: false,
        links: false
    }
}
