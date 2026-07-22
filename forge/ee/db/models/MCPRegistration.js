/**
 * Stores MCP endpoints for a Team
 */
const { DataTypes, literal, Op } = require('sequelize')

module.exports = {
    name: 'MCPRegistration',
    schema: {
        name: { type: DataTypes.STRING },
        protocol: { type: DataTypes.STRING },
        targetType: { type: DataTypes.STRING, allowNull: false },
        targetId: { type: DataTypes.STRING, allowNull: false },
        nodeId: { type: DataTypes.STRING, allowNull: false },
        endpointRoute: { type: DataTypes.STRING, allowNull: false },
        title: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
        version: { type: DataTypes.STRING, allowNull: false, defaultValue: '1.0.0' },
        description: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' }
    },
    indexes: [
        { name: 'mcp_team_type_unique', fields: ['targetId', 'targetType', 'nodeId', 'TeamId'], unique: true }
    ],
    associations: function (M) {
        this.belongsTo(M.Team, { foreignKey: { allowNull: false } })
        this.belongsTo(M.Project, { foreignKey: 'targetId', constraints: false }) // allow byTeam to include instance info
        this.belongsTo(M.Device, { foreignKey: 'targetId', constraints: false }) // allow byTeam to include instance info
    },
    finders: function (M, app) {
        const isPG = this.sequelize.getDialect() === 'postgres'
        const instanceOwnershipJoin = literal(`
            "MCPRegistration"."targetType" = 'instance'
            AND (
                CASE
                    WHEN "MCPRegistration"."targetType" = 'instance'
                    THEN "MCPRegistration"."targetId"${isPG ? '::uuid' : ''}
                END
            ) = "Project"."id"
        `)
        const deviceOwnershipJoin = literal(`
            "MCPRegistration"."targetType" = 'device'
            AND (
                CASE
                    WHEN "MCPRegistration"."targetType" = 'device'
                    THEN "MCPRegistration"."targetId"${isPG ? '::int' : ''}
                END
            ) = "Device"."id"
        `)
        return {
            static: {
                byTeam: async (teamIdOrHash, {
                    includeTeam = false,
                    includeInstance = false,
                    filterId = null
                } = {}) => {
                    let teamId = teamIdOrHash
                    if (typeof teamId === 'string') {
                        teamId = M.Team.decodeHashid(teamId)
                    }
                    const where = { TeamId: teamId }
                    if (filterId) {
                        // accept an array of registration ids (numeric or hashid) to filter by
                        const idList = (Array.isArray(filterId) ? filterId : [filterId])
                            .map(id => typeof id === 'string' ? M.MCPRegistration.decodeHashid(id) : id)
                            .flat()
                            .filter(id => !!id)
                        where.id = { [Op.in]: idList }
                    }
                    const include = []
                    if (includeTeam) {
                        include.push({ model: M.Team, include: { model: M.TeamType } })
                    }
                    if (includeInstance) {
                        include.push({
                            model: M.Project,
                            attributes: ['hashid', 'id', 'name', 'slug', 'links', 'url', 'ApplicationId', 'state', 'versions'],
                            required: false,
                            on: instanceOwnershipJoin
                        })
                        include.push({
                            model: M.Device,
                            attributes: ['hashid', 'id', 'name', 'type', 'ApplicationId', 'state', 'lastSeenAt', 'agentVersion'],
                            required: false,
                            on: deviceOwnershipJoin,
                            include: {
                                model: M.Project,
                                attributes: ['ApplicationId']
                            }
                        })
                    }
                    return this.findAll({
                        where,
                        include
                    })
                },
                byTypeAndIDs: async (targetType, targetId, nodeId, teamId) => {
                    const where = {
                        targetType,
                        targetId,
                        nodeId
                    }
                    if (teamId !== undefined) {
                        where.TeamId = teamId
                    }
                    return this.findOne({ where })
                },
                byId: async (idOrHash, { includeAssociations = false } = {}) => {
                    let id = idOrHash
                    if (typeof idOrHash === 'string') {
                        id = M.MCPRegistration.decodeHashid(idOrHash)
                    }
                    const where = { id }
                    return this.findOne({
                        where
                    })
                }
            }
        }
    }
}
