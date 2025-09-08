/**
 * 
 */
const { DataTypes, Model } = require('sequelize')

const Controllers = require('../controllers')
const { generatePassword } = require('../../lib/userTeam')

module.exports = {
    name: 'TeamBrokerAgent',
    schema: {
        state: { type: DataTypes.STRING, allowNull: false, default: 'running'},
        settings: {
            type: DataTypes.TEXT,
            allowNull: true,
            default: '{}',
            get () {
                const rawValue = this.getDataValue('settings')
                if (rawValue) {
                    return JSON.parse(rawValue)
                } else {
                    return {}
                }
            },
            set (value) {
                if (value) {
                    this.setDataValue('settings', JSON.stringify(value))
                }
            }
        },
        auth: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: function () {
                return generatePassword()
            }
        }
    },
    indexes: [
        { name: 'team_broker_agent_team_unique', fields: ['id', 'TeamId'], unique: true  }
    ],
    hooks: function (M, app) {
        return {
            afterDestroy: async (teamBrokerAgent, opts) => {
                await M.AccessToken.destroy({
                    where: {
                        ownerType: 'teamBrokerAgent',
                        ownerId: '' + teamBrokerAgent.id
                    }
                })
            }
        }
    },
    associations: function (M) {
        this.belongsTo(M.Team)
        this.hasOne(M.AccessToken, {
            foreignKey: 'ownerId',
            constraints: false,
            scope: {
                ownerType: 'teamBrokerAgent'
            }
        })
    },
    finders: function (M) {
        return {
            instance: {
                async refreshAuthTokens () {
                    const brokerToken = await Controllers.AccessToken.createTokenForTeamBrokerAgent(this, null)
                    return {
                        token: brokerToken.token
                    }
                }
            },
            static: {
                byId: async function (idOrHash) {
                    let id = idOrHash
                    if (typeof id === 'string') {
                        id = M.TeamBrokerAgent.decodeHashid(idOrHash)
                    }
                    return this.findOne({
                        where: { id },
                        include: {
                            model: M.Team
                        }
                    })
                },
                byTeam: async function (teamId) {
                    if (typeof teamId === 'string') {
                        teamId = M.Team.decodeHashid(teamId)
                    }
                    this.findOne({
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