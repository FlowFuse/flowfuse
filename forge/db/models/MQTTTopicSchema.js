/**
 * Stores topics from brokers to build schema
 */

const { DataTypes } = require('sequelize')

module.exports = {
    name: 'MQTTTopicSchema',
    schema: {
        topic: { type: DataTypes.STRING, allowNull: false },
        metadata: { type: DataTypes.TEXT, allowNull: true }
    },
    // indexes: [
    //     { name : '', fields}
    // ],
    associations: function (M) {
        this.belongsTo(M.Team, { foreignKey: { allowNull: false } })
        this.belongsTo(M.BrokerCredentials, { foreignKey: { allowNull: true } })
    },
    finders: function(M, app) {
        return {
            static: {
                byId: async (id) => {
                    if (typeof id === 'string') {
                        id = M.MQTTTopicSchema.decodeHashid(id)
                    }
                    return this.findOne({
                        where: { id }
                    })
                },
                byBroker: async (brokerId) => {
                    if (typeof brokerId === 'string') {
                        brokerId = M.BrokerCredentials.decodeHashid(id)
                    }
                    return this.findAll({
                        where: { BrokerCredentialsId: brokerId }
                    })
                },
                byTeam: async (teamId) => {
                    if (typeof teamId === 'string') {
                        teamId = M.Team.decodeHashid(id)
                    }
                    return this.findAll({
                        where: { TeamId: teamId }
                    })
                },
                getTeamBroker: async (teamId) => {
                    if (typeof teamId === 'string') {
                        teamId = M.Team.decodeHashid(id)
                    }
                    return this.findAll({
                        where: {
                            TeamId: teamId,
                            BrokerCredentialsId: null
                        }
                    })
                }
            }
        }
    }
}