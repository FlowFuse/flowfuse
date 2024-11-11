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
                    const where = await M.AuditLog.buildScopeClause('project', projectId, pagination)
                    return M.AuditLog.forEntity(where, pagination)
                },
                forTeam: async (teamId, pagination = {}) => {
                    const where = await M.AuditLog.buildScopeClause('team', teamId, pagination)
                    return M.AuditLog.forEntity(where, pagination)
                },
                forApplication: async (applicationId, pagination = {}) => {
                    const where = await M.AuditLog.buildScopeClause('application', applicationId, pagination)
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
                    const whereFinal = buildPaginationSearchClause(
                        pagination,
                        where,
                        // These are the columns that are searched using the `query` query param
                        ['AuditLog.event', 'AuditLog.body', 'User.username', 'User.name'],
                        // These map additional query params to specific columns to allow filtering
                        {
                            event: 'AuditLog.event',
                            username: 'User.username'
                        }
                    )
                    const { count, rows } = await this.findAndCountAll({
                        where: whereFinal,
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
                    //  * Get all log entries for the project starting from the pagination cursor & limited by the pagination limit
                    //    where they meet the criteria for project history (see Op.in filter below)
                    //  * If the log entry has a snapshot, match it up to the actual snapshot object and replace in in the body
                    //    This updates any stale snapshot references in the log entries
                    //    Additionally, flag snapshot existence in the info object as { snapshotExists: true/false }
                    //    (The info object is a permitted field in the audit log entry body (schema))
                    // * Return the log entries as { meta: Object, count: Number, timeline: Array<Object> }

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

                    // 2. sanitise log entries
                    for (const row of rows) {
                        try {
                            row.body = typeof row.body === 'string' ? JSON.parse(row.body) : JSON.parse('' + row.body)
                            delete row.body.project // we don't need to include the project object in specific project history
                        } catch (_e) {
                            row.body = {}
                        }
                    }

                    // 3. update snapshot references
                    const snapshotRows = rows.filter(row => row.body?.snapshot)
                    if (snapshotRows.length) {
                        const snapshotIds = snapshotRows.length && snapshotRows.map(entry => entry.body.snapshot.id)
                        const snapshots = await M.ProjectSnapshot.findAll({
                            where: { id: { [Op.in]: snapshotIds } },
                            attributes: ['id', 'hashid', 'name', 'description', 'createdAt']
                        })
                        if (snapshots?.length) {
                            for (const row of snapshotRows) {
                                if (row.body?.snapshot) {
                                    if (typeof row.body.info !== 'object') {
                                        row.body.info = row.body.info ? { _info: row.body.info } : {}
                                    }
                                    const snapshot = snapshots.find(s => s.id === row.body.snapshot.id)
                                    row.body.snapshot = snapshot || row.body.snapshot
                                    row.body.info.snapshotExists = !!snapshot
                                }
                            }
                        }
                    }

                    // 4. Return the log entries
                    result.meta.next_cursor = rows.length < limit ? undefined : rows[rows.length - 1].hashid
                    result.count = rows.length
                    result.timeline = rows
                    return result
                },
                buildScopeClause: async (entityType, entityId, pagination) => {
                    /*
                    The AuditLogs table has entityType [platform|team|application|project|device] and an associated entityId which is dependent on the entityType.
                    To get entries for the team, we need to get:
                        * all entries where AuditLog.entityType = 'team' and AuditLog.entityId = teamId
                        * all entries where AuditLog.entityType = 'project' and Project.TeamId = teamId where Project.id = AuditLog.entityId
                        * all entries where AuditLog.entityType = 'device' and Device.TeamId = teamId where Device.id = AuditLog.entityId
                    To get entries for the application we need to get:
                        * all entries where AuditLog.entityType = 'application' and Application.TeamId = teamId where Application.id = AuditLog.entityId
                    To get entries for the project, we need to get:
                        * all entries where AuditLog.entityType = 'project' and Project.ApplicationId = applicationId where Project.id = AuditLog.entityId
                    To get entries for devices, we need to get:
                        * all entries where AuditLog.entityType = 'device' and Device.ProjectId = projectId where Device.id = AuditLog.entityId
                        OR
                        * all entries where AuditLog.entityType = 'device' and Device.ApplicationId = applicationId where Device.id = AuditLog.entityId
                    Then there are filtering considerations like includeChildren, and the top level scope. e.g. In getting entries for a team, the user
                    may only want application or project scoped entries. In getting entries for an application, the user may only want project or device scoped entries.
                    The below code handles all these considerations.
                    */

                    const permittedEntityScopes = {
                        team: ['team', 'application', 'project', 'device'],
                        application: ['application', 'project', 'device'],
                        project: ['project', 'device']
                    }
                    if (permittedEntityScopes[entityType] === undefined) {
                        throw new Error(`Invalid audit entity: ${entityType}`)
                    }
                    const permittedScopes = permittedEntityScopes[entityType]
                    const scope = (pagination.scope || entityType)
                    const includeChildren = [true, 'true', '1'].includes(pagination.includeChildren)
                    delete pagination.includeChildren
                    delete pagination.scope
                    if (!permittedScopes.includes(scope)) {
                        throw new Error(`Invalid audit scope: ${scope}`)
                    }

                    const whereClauses = []
                    const addTeamScope = async (teamId, includeChildren = false) => {
                        whereClauses.push({
                            entityType: 'team',
                            entityId: teamId.toString()
                        })
                        if (includeChildren) {
                            await addApplicationScope(teamId, null, false, false) // only the applications (instances and devices will be included by addInstanceScope and addDeviceScope)
                            await addInstanceScope(teamId, null, null, false) // only the instances (devices will be included by addDeviceScope)
                            await addDeviceScope(teamId, null)
                        }
                    }
                    const addApplicationScope = async (teamId, applicationId = null, includeInstances = false, includeApplicationDevices = false, includeInstanceDevices = false) => {
                        let applicationIds = []
                        if (applicationId) {
                            applicationIds = [applicationId]
                            whereClauses.push({
                                entityType: 'application',
                                entityId: applicationId.toString()
                            })
                        } else {
                            const clause = { TeamId: teamId }
                            applicationIds = (await M.Application.findAll({ where: clause, attributes: ['id'] })).map(a => a.id?.toString()).filter(a => !!a)
                            if (applicationIds.length) {
                                whereClauses.push({
                                    entityType: 'application',
                                    entityId: { [Op.in]: applicationIds }
                                })
                            }
                        }
                        if (applicationId === null && includeInstances && includeApplicationDevices && includeInstanceDevices) {
                            // Since applicationId is null, we are doing this for the team.
                            // And since all of the flags are all true, we can just add all instances and all devices
                            // belonging to the team (regardless of who owns them) instead of adding them iteratively
                            await addInstanceScope(teamId, null, null, false) // only the instances (devices will be included by addDeviceScope)
                            await addDeviceScope(teamId, null) // all devices belonging to the team
                        } else {
                            if (includeInstances) {
                                for (const appId of applicationIds) {
                                    await addInstanceScope(teamId, appId, null, includeInstanceDevices)
                                }
                            }
                            if (includeApplicationDevices) {
                                for (const appId of applicationIds) {
                                    await addDeviceScope(teamId, appId, null)
                                }
                            }
                        }
                    }
                    const addInstanceScope = async (teamId, applicationId = null, instanceId = null, includeInstanceDevices = false) => {
                        let instanceIds = []
                        if (instanceId) {
                            instanceIds = [instanceId]
                            whereClauses.push({
                                entityType: 'project',
                                entityId: instanceId.toString()
                            })
                        } else {
                            const clause = { TeamId: teamId }
                            if (applicationId) {
                                clause.ApplicationId = applicationId
                            }
                            instanceIds = (await M.Project.findAll({ where: clause, attributes: ['id'] })).map(p => p.id?.toString()).filter(p => !!p)
                            if (instanceIds.length) {
                                whereClauses.push({
                                    entityType: 'project',
                                    entityId: { [Op.in]: instanceIds }
                                })
                            }
                        }
                        if (includeInstanceDevices) {
                            for (const instanceId of instanceIds) {
                                await addDeviceScope(teamId, null, instanceId)
                            }
                        }
                    }
                    const addDeviceScope = async (teamId, applicationId = null, instanceId = null) => {
                        const clause = { TeamId: teamId }
                        if (instanceId) {
                            clause.ProjectId = instanceId
                        }
                        if (applicationId) {
                            clause.ApplicationId = applicationId
                        }
                        const ids = (await M.Device.findAll({ where: clause, attributes: ['id'] })).map(d => d.id?.toString()).filter(d => !!d)
                        if (ids.length) {
                            whereClauses.push({
                                entityType: 'device',
                                entityId: { [Op.in]: ids }
                            })
                        }
                    }

                    if (entityType === 'team') {
                        const teamId = entityId
                        if (scope === 'team') {
                            await addTeamScope(teamId, includeChildren)
                        } else if (scope === 'application') {
                            await addApplicationScope(teamId, null, includeChildren, includeChildren, includeChildren)
                        } else if (scope === 'project') {
                            await addInstanceScope(teamId, null, null, includeChildren)
                        } else if (scope === 'device') {
                            await addDeviceScope(teamId) // all devices belonging to the team
                        }
                    } else if (entityType === 'application') {
                        const applicationId = entityId
                        const application = await M.Application.byId(applicationId)
                        const teamId = application.TeamId
                        if (scope === 'application') {
                            await addApplicationScope(teamId, application.id, includeChildren, includeChildren, includeChildren)
                        } else if (scope === 'project') {
                            await addInstanceScope(teamId, application.id, null, includeChildren)
                        } else if (scope === 'device') {
                            await addDeviceScope(teamId, application.id) // all devices belonging to the application
                        }
                    } else if (entityType === 'project') {
                        const projectId = entityId
                        const project = await M.Project.byId(projectId)
                        const teamId = project.TeamId
                        if (scope === 'device') {
                            await addDeviceScope(teamId, null, projectId) // all devices belonging to the instance
                        } else {
                            await addInstanceScope(teamId, null, projectId, includeChildren)
                        }
                    }

                    if (whereClauses.length === 1) {
                        return whereClauses[0]
                    } else if (whereClauses.length > 1) {
                        return { [Op.or]: whereClauses }
                    }
                    return null
                }
            }
        }
    },
    meta: {
        slug: false,
        links: false
    }
}
