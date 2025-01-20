/**
 * Credentials for connecting to 3rd Party MQTT brokers
 */
const { DataTypes } = require('sequelize')

const Controllers = require('../controllers')

module.exports = {
    name: 'BrokerCredentials',
    schema: {
        name: { type: DataTypes.STRING, allowNull: false },
        host: { type: DataTypes.STRING, allowNull: false },
        port: { type: DataTypes.INTEGER, allowNull: false, default: 1883 },
        protocol: { type: DataTypes.STRING, allowNull: false, default: 'mqtt:' },
        protocolVersion: { type: DataTypes.INTEGER, allowNull: false, default: 4 },
        ssl: { type: DataTypes.BOOLEAN, allowNull: false, default: false },
        verifySSL: { type: DataTypes.BOOLEAN, allowNull: false, default: false },
        clientId: { type: DataTypes.STRING, allowNull: false },
        credentials: { type: DataTypes.TEXT, allowNull: false },
        state: { type: DataTypes.STRING, allowNull: false, default: 'running' }
    },
    indexes: [
        { name: 'broker_name_team_unique', fields: ['name', 'TeamId'], unique: true }
    ],
    hooks: function (M, app) {
        return {
            afterDestroy: async( brokerCredentials, opts) => {
                await M.AccessToken.destroy({
                    where: {
                        ownerType: 'broker',
                        ownerId: brokerCredentials.id
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
                ownerType: 'broker'
            }
        })
    },
    finders: function (M) {
        return {
            instance: {
                async refreshAuthTokens () {
                    const brokerToken = await Controllers.AccessToken.createTokenForBroker(this, null)
                    return {
                        token: brokerToken.token
                    }
                }
            },
            static: {
                byId: async function (idOrHash) {
                    let id = idOrHash
                    if (typeof id === 'string') {
                        id = M.BrokerCredentials.decodeHashid(idOrHash)
                    }
                    return this.findOne({
                        where: { id }
                    })
                },
                byTeam: async function (teamId) {
                    if (typeof teamId === 'string') {
                        teamId = M.Team.decodeHashid(teamId)
                    }
                    return this.findAll({
                        where: {
                            TeamId: teamId
                        }
                    })
                }
            }
        }
    }
}
