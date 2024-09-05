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
    associations: function (M) {
        this.belongsTo(M.Team)
    },
    finders: function (M) {
        return {
            static: {
                byUsername: async (username) => {
                    return this.findOne({
                        where: { username }
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