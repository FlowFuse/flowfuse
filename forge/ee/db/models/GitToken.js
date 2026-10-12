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
        },
        type: {
            type: DataTypes.STRING,
            allowNull: false,
            default: 'github'
        },
        username: {
            type: DataTypes.STRING,
            allowNull: true
        },
        caCertificate: {
            type: DataTypes.TEXT,
            allowNull: true
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
                        try {
                            id = M.GitToken.decodeHashid(id)
                        } catch (err) {
                            return null
                        }
                        if (Array.isArray(id)) {
                            id = id[0]
                        }
                        if (id === undefined || id === null) {
                            return null
                        }
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
