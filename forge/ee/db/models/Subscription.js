const {
    DataTypes
} = require('sequelize')

// A subset of the statuses on Stripe that are important to FlowForge
// https://stripe.com/docs/billing/subscriptions/overview#subscription-statuses
const STATUS = {
    ACTIVE: 'active',
    CANCELED: 'canceled'
}
Object.freeze(STATUS)

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
        status: {
            type: DataTypes.ENUM(Object.values(STATUS)),
            allowNull: false
        }
    },
    associations: function (M) {
        this.belongsTo(M.Team)
    },
    hooks: function (M) {
        // M.Team.addHook('afterCreate', (Team, options) => {
        //     console.log("Subscription hook on Team")
        // })
        // M.Team.addHook('afterDestroy', (Team, options) => {
        //     console.log("Subscription destroy hook on Team")
        // })
        return {}
    },
    finders: function (M) {
        const self = this
        return {
            instance: {
                isActive () {
                    return this.status === STATUS.ACTIVE
                },
                isCanceled () {
                    return this.status === STATUS.CANCELED
                }
            },
            static: {
                STATUS,
                byTeam: async function (team) {
                    if (typeof team === 'string') {
                        team = M.Team.decodeHashid(team)
                    }
                    return self.findOne({
                        where: {
                            TeamId: team
                        },
                        include: {
                            model: M.Team,
                            attributes: ['id', 'name', 'slug', 'links']
                        }
                    })
                },
                byCustomer: async function (customer) {
                    return self.findOne({
                        where: {
                            customer
                        },
                        include: {
                            model: M.Team,
                            attributes: ['id', 'name', 'slug', 'links']
                        }
                    })
                }
            }
        }
    }
}
