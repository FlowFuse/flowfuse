const { DataTypes } = require('sequelize')

const { hash } = require('../../../db/utils')

module.exports = {
    name: 'TeamBrokerUser',
    schema: {
        username: { type: DataTypes.STRING, allowNull: false },
        password: {
            type: DataTypes.STRING,
            set (value) {
                this.setDataValue('password', hash(value))
            }
        },
        acls: { type: DataTypes.STRING, defaultValue: '#' }
    },
    indexs: [
        { name: 'broker_users_team_unique', fields: ['username','TeamId'], unique: true }
    ],
    associations: function (M) {
        this.belongsTo(M.Team)
    },
    finders: function (M) {
        return {
            static: {
                byUsername: async (username, teamHashId) => {
                    let teamId = teamHashId
                    if (typeof teamHashId === 'string') {
                        teamId = M.Team.decodeHashid(teamHashId)
                    }
                    return this.findOne({
                        where: { username, TeamId: teamId }
                    })
                },
                byTeam: async (teamHashId) => {
                    const teamId = M.Team.decodeHashid(teamHashId)
                    return this.findAll({
                        include: {
                            model: M.Team,
                            attributes: ['name'],
                            where: { id: teamId }
                        }
                    })
                }
            }
        }
    }
}