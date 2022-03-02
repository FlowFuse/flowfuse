const {
    DataTypes
} = require('sequelize')

module.exports = {
    name: 'Subscription',
    schema: {
        customer: {
            type: DataTypes.STRING,
            allowNull: false
        },
        subscription: {
            type: DataTypes.STRING,
            allowNull: false
        },
    },
    associations: function(M) {
        this.belongsTo(M.Team)
    },
    hooks: function(M) {
        // M.Team.addHook('afterCreate', (Team, options) => {
        //     console.log("Subscription hook on Team")
        // })
        // M.Team.addHook('afterDestroy', (Team, options) => {
        //     console.log("Subscription destroy hook on Team")
        // })
        return {}
    },
    finders: function(M) {
        const self = this
        return {
            static: {
                byTeam: async function(team) {
                    if (typeof team === 'string') {
                        team = M.Team.decodeHashid(team)
                    }
                    return self.findOne({
                        where: {
                            TeamId: team
                        },
                        include: {
                            module: M.Team,
                            attributes: ['id', 'name', 'slug', 'links']
                        }
                    })
                }
            }
        }
    }
}