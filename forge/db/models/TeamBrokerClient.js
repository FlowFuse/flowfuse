const { DataTypes, literal } = require('sequelize')

const { hash, buildPaginationSearchClause } = require('../utils')

module.exports = {
    name: 'TeamBrokerClient',
    schema: {
        username: { type: DataTypes.STRING, allowNull: false },
        password: {
            type: DataTypes.STRING,
            set (value) {
                this.setDataValue('password', hash(value))
            }
        },
        acls: { type: DataTypes.STRING, defaultValue: '{ "action": "both", pattern: "#" }' },
        ownerId: { type: DataTypes.STRING, allowNull: true },
        ownerType: { type: DataTypes.STRING, allowNull: true }
    },
    indexes: [
        { name: 'broker_users_team_unique', fields: ['username', 'TeamId'], unique: true }
    ],
    associations: function (M) {
        this.belongsTo(M.Team)
        this.belongsTo(M.Project, { foreignKey: 'ownerId', constraints: false })
        this.belongsTo(M.Device, { foreignKey: 'ownerId', constraints: false })
    },
    hooks: function (M, app) {
        return {
            beforeCreate: async (project, opts) => {
                // if the product is licensed, we permit overage
                const isLicensed = app.license.active()
                if (isLicensed !== true) {
                    const { mqttClients } = await app.license.usage('mqttClients')
                    if (mqttClients.count >= mqttClients.limit) {
                        throw new Error('license limit reached')
                    }
                }
            },
            afterCreate: async (project, opts) => {
                const { mqttClients } = await app.license.usage('mqttClients')
                if (mqttClients.count > mqttClients.limit) {
                    await app.auditLog.Platform.platform.license.overage('system', null, mqttClients)
                }
            }
        }
    },
    finders: function (M) {
        const isPG = this.sequelize.getDialect() === 'postgres'
        const instanceOwnershipJoin = literal(`
            "TeamBrokerClient"."ownerType" = 'project'
            AND (
                CASE
                    WHEN "TeamBrokerClient"."ownerType" = 'project'
                    THEN "TeamBrokerClient"."ownerId"${isPG ? '::uuid' : ''}
                END
            ) = "Project"."id"
        `)
        const deviceOwnershipJoin = literal(`
            "TeamBrokerClient"."ownerType" = 'device'
            AND (
                CASE
                    WHEN "TeamBrokerClient"."ownerType" = 'device'
                    THEN "TeamBrokerClient"."ownerId"${isPG ? '::int' : ''}
                END
            ) = "Device"."id"
        `)
        return {
            static: {
                byUsername: async (username, teamHashId, includeTeam = true, includeInstance = false) => {
                    let teamId = teamHashId
                    if (typeof teamHashId === 'string') {
                        teamId = M.Team.decodeHashid(teamHashId)
                    }
                    const include = []
                    if (includeTeam) {
                        include.push({ model: M.Team, include: { model: M.TeamType } })
                    }
                    if (includeInstance) {
                        include.push({
                            model: M.Project,
                            attributes: ['hashid', 'id', 'name', 'slug', 'links', 'url', 'ApplicationId'],
                            required: false,
                            on: instanceOwnershipJoin
                        })
                        include.push({
                            model: M.Device,
                            attributes: ['hashid', 'id', 'name', 'type', 'ApplicationId'],
                            required: false,
                            on: deviceOwnershipJoin,
                            include: {
                                model: M.Project,
                                attributes: ['ApplicationId']
                            }
                        })
                    }
                    return this.findOne({
                        where: { username, TeamId: teamId },
                        include
                    })
                },
                byTeam: async (teamHashId, pagination = {}, where = {}, options = {}) => {
                    const teamId = M.Team.decodeHashid(teamHashId)
                    const limit = Math.min(parseInt(pagination.limit) || 100, 100)
                    if (pagination.cursor) {
                        pagination.cursor = M.TeamBrokerClient.decodeHashid(pagination.cursor)
                    }
                    const [rows, count] = await Promise.all([
                        this.findAll({
                            where: buildPaginationSearchClause(pagination, { ...where, TeamId: teamId }, ['TeamBrokerClient.username']),
                            include: [
                                {
                                    model: M.Team,
                                    attributes: ['name'],
                                    where: { id: teamId }
                                },
                                {
                                    model: M.Project,
                                    attributes: ['hashid', 'id', 'name', 'slug', 'links', 'url', 'ApplicationId'],
                                    required: false,
                                    on: instanceOwnershipJoin
                                },
                                {
                                    model: M.Device,
                                    attributes: ['hashid', 'id', 'name', 'type', 'ApplicationId'],
                                    required: false,
                                    on: deviceOwnershipJoin,
                                    include: {
                                        model: M.Project,
                                        attributes: ['ApplicationId']
                                    }
                                }
                            ],
                            order: [['id', 'ASC']],
                            limit
                        }),
                        this.count({
                            include: {
                                model: M.Team,
                                where: { id: teamId }
                            }
                        })
                    ])
                    return {
                        meta: {
                            next_cursor: rows.length === limit ? rows[rows.length - 1].hashid : undefined
                        },
                        count,
                        clients: rows
                    }
                },
                countTeam: async (teamHashId) => {
                    const teamId = M.Team.decodeHashid(teamHashId)
                    return await this.count({
                        include: {
                            model: M.Team,
                            where: { id: teamId }
                        }
                    })
                }
            }
        }
    }
}
