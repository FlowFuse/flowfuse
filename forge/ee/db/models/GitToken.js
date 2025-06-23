const { DataTypes } = require('sequelize')

module.exports = {
    name: 'GitToken',
    schema: {
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        token: {
            type: DataTypes.STRING,
            allowNull: false
        }
    },
    associations: function (M) {
        this.belongsTo(M.Team, { onDelete: 'CASCADE' })
    },
    finders: function (M) {
        return {
            static: {
                byId: async function (id, teamId) {
                    if (typeof id === 'string') {
                        id = M.GitToken.decodeHashid(id)
                    }
                    const where = { id }
                    if (teamId) {
                        if (typeof teamId === 'string') {
                            teamId = M.Team.decodeHashid(teamId)
                        }
                        where.TeamId = teamId
                    }
                    return this.findOne({ where })
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
