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
        // Customer ID from stripe, e.g. cus_xyz123
        // Each team has one subscription, that is tied to a single stripe customer, via the customer ID field
        customer: {
            type: DataTypes.STRING,
            allowNull: false
        },
        // Subscription ID from stripe e.g. sub_xyz123
        // Stored for reference only, Stripe events should only be matched to subscription objects via
        // the customer field
        subscription: {
            type: DataTypes.STRING,
            allowNull: false
        },
        status: {
            type: DataTypes.ENUM(Object.values(STATUS)),
            allowNull: false,
            defaultValue: STATUS.ACTIVE
        }
    },
    associations: function (M) {
        this.belongsTo(M.Team)
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
