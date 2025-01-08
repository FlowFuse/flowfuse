/**
 * 
 */
const { DataTypes } = require('sequelize')

module.exports = {
    name: 'BrokerCredentials',
    schema: {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: DataTypes.STRING, allowNull: false },
        host: { type: DataTypes.STRING, allowNull: false },
        port: { type: DataTypes.INTEGER, allowNull: false, default: 1883 },
        protocol: { type: DataTypes.STRING, allowNull: false, default: 'mqtt:'},
        protocolVersion: { type: DataTypes.INTEGER, allowNull: false, default: 4},
        ssl: { type: DataTypes.BOOLEAN, allowNull: false, default: false },
        verifySSL: { type: DataTypes.BOOLEAN, allowNull: false, default: false },
        clientId: { type: DataTypes.STRING, allowNull: false },
        credentials: { type: DataTypes.TEXT, allowNull: false }
    },
    associations: function (M) {
        this.belongsTo(M.Team)
    },
    finders: function (M) {
        return {
            static: {
                byId: async function (idOrHash) {
                    let id = idOrHash
                    if (typeof id === 'string') {
                        id = M.BrokerCredentials.decodeHasid(idOrHash)
                    }
                    return this.findOne({
                        where: { id }
                    })
                },
                byTeam: async function (teamId) {
                    if (typeof teamId === 'string') {
                        teamId = M.Team.decodeHasid(teamId)
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