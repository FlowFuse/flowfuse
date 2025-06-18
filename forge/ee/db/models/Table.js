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
                    return self.findOne({
                        where: {
                            TeamId: teamId
                        }
                    })
                }
            }
        }
    }
}
