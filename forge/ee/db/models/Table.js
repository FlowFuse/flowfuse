const { DataTypes } = require('sequelize')

module.exports = {
    name: 'Table',
    schema: {
        credentials: {
            type: DataTypes.TEXT,
            set (value) {
                this.setDataValue('credentials', JSON.stringify(value))
            },
            get () {
                const rawValue = this.getDataValue('credentials') || '{}'
                return JSON.parse(rawValue)
            }
        }
    },
    associations: function (M) {
        this.belongsTo(M.Team, { onDelete: 'CASCADE' })
    },
    finders: function (M) {
        const self = this
        return {
            static: {
                byTeamId: async (teamId) => {
                    if (typeof teamId === 'string') {
                        teamId = M.Team.decodeHashid(teamId)
                    }
                    return self.find({
                        where: {
                            TeamId: teamId
                        }
                    })
                },
                byId: async (id, teamId) => {
                    if (typeof teamId === 'string') {
                        teamId = M.Team.decodeHashid(teamId)
                    }
                    if (typeof id === 'string') {
                        id = M.Table.decodeHashid(id)
                    }
                    return self.findOne({
                        where: {
                            id,
                            TeamId: teamId
                        }
                    })
                }
            }
        }
    }
}
