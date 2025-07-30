const { DataTypes } = require('sequelize')

module.exports = {
    name: 'Table',
    schema: {
        name: {
            type: DataTypes.STRING, allowNull: false
        },
        credentials: {
            type: DataTypes.TEXT,
            set (value) {
                this.setDataValue('credentials', JSON.stringify(value))
            },
            get () {
                const rawValue = this.getDataValue('credentials') || '{}'
                return JSON.parse(rawValue)
            }
        },
        meta: {
            type: DataTypes.TEXT,
            set (value) {
                this.setDataValue('meta', JSON.stringify(value))
            },
            get () {
                const rawValue = this.getDataValue('meta') || '{}'
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
                    return self.findAll({
                        where: {
                            TeamId: teamId
                        }
                    })
                },
                byId: async (teamId, databaseId) => {
                    if (typeof teamId === 'string') {
                        teamId = M.Team.decodeHashid(teamId)[0]
                    }
                    if (typeof databaseId === 'string') {
                        databaseId = M.Table.decodeHashid(databaseId)[0]
                    }
                    if (!teamId || !databaseId) {
                        return null
                    }
                    return self.findOne({
                        where: {
                            id: databaseId,
                            TeamId: teamId
                        }
                    })
                }
            }
        }
    }
}
