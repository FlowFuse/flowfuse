/**
 * Stores MCP endpoints for a Team
 */
const { DataTypes } = require('sequelize')

module.exports = {
    name: 'MCPRegistration',
    schema: {
        name: { type: DataTypes.STRING },
        protocol: { type: DataTypes.STRING },
        targetType: { type: DataTypes.STRING, allowNull: false },
        targetId: { type: DataTypes.STRING, allowNull: false },
        nodeId: { type: DataTypes.STRING, allowNull: false },
        endpointRoute: { type: DataTypes.STRING, allowNull: false }
    },
    indexes: [
        { name: 'mcp_team_type_unique', fields: ['targetId', 'targetType', 'nodeId', 'TeamId'], unique: true }
    ],
    associations: function (M) {
        this.belongsTo(M.Team, { foreignKey: { allowNull: false } })
    },
    finders: function (M, app) {
        return {
            static: {
                byTeam: async (teamId) => {
                    if (typeof teamId === 'string') {
                        teamId = M.Team.decodeHashid(teamId)
                    }
                    return this.findAll({
                        where: { TeamId: teamId }
                    })
                },
                byTypeAndIDs: async (targetType, targetId, nodeId) => {
                    return this.findOne({
                        where: {
                            targetType,
                            targetId,
                            nodeId
                        }
                    })
                }
            }
        }
    }
}
