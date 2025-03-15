const {
    DataTypes
} = require('sequelize')

const STATUS = {
    // Any changes to this list *must* be made via migration.
    // See forge/db/migrations/20230130-01-add-subscription-trial-date.js for example

    // A subset of the statuses on Stripe that are important to FlowFuse
    // https://stripe.com/docs/billing/subscriptions/overview#subscription-statuses
    ACTIVE: 'active',
    CANCELED: 'canceled',
    PAST_DUE: 'past_due',
    // Local only status, not from Stripe
    TRIAL: 'trial',
    // Local only - means this team's subscription on stripe is not
    // managed by the platform
    UNMANAGED: 'unmanaged'
}

Object.freeze(STATUS)

// Statuses used to track team trial state
const TRIAL_STATUS = {
    // Any changes to this list *must* be made via migration.
    // See forge/db/migrations/20230130-01-add-subscription-trial-date.js for example
    NONE: 'none',
    CREATED: 'created',
    WEEK_EMAIL_SENT: 'week_email_sent',
    DAY_EMAIL_SENT: 'day_email_sent',
    ENDED: 'ended'
}

Object.freeze(TRIAL_STATUS)

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
        },
        trialStatus: {
            type: DataTypes.ENUM(Object.values(TRIAL_STATUS)),
            allowNull: false,
            defaultValue: TRIAL_STATUS.NONE
        },
        trialEndsAt: { type: DataTypes.DATE, defaultValue: null, allowNull: true }
    },
    associations: function (M) {
        this.belongsTo(M.Team)
        M.Team.hasOne(this)
    },
    finders: function (M) {
        const self = this
        return {
            instance: {
                // States:
                //  isActive : Billing details setup
                //  isUnmanaged : The subscription on stripe is manually managed - no further setup required
                //  isTrial  : In trial mode, no billing details setup, trial might have ended (isTrialEnded)
                //  isActive && !isTrialEnded : Started as a trial, added billing, still in trial period
                //  isActive && isTrialEnded  : Started as trial, added billing, trial ended

                // Should this subscription be treated as active/usable
                isActive () {
                    return this.status === STATUS.ACTIVE || this.status === STATUS.PAST_DUE
                },
                isUnmanaged () {
                    return this.status === STATUS.UNMANAGED
                },
                isCanceled () {
                    return this.status === STATUS.CANCELED
                },
                isPastDue () {
                    return this.status === STATUS.PAST_DUE
                },
                isTrial () {
                    // This subscription is in trial mode without billing setup
                    return !!this.trialEndsAt || this.status === STATUS.TRIAL
                },
                isTrialEnded () {
                    // A Subscription can have status === ACTIVE but still be in
                    // trial mode. This means they have entered billing details
                    // but the trial has not yet expired.
                    //
                    return !this.trialEndsAt || this.trialEndsAt < Date.now()
                },

                async clearTrialState () {
                    this.trialEndsAt = null
                    this.trialStatus = TRIAL_STATUS.ENDED
                    return this.save()
                }
            },
            static: {
                STATUS,
                TRIAL_STATUS,
                byTeamId: async function (teamId) {
                    if (typeof teamId === 'string') {
                        teamId = M.Team.decodeHashid(teamId)
                    }
                    return self.findOne({
                        where: {
                            TeamId: teamId
                        },
                        include: {
                            model: M.Team,
                            attributes: ['id', 'name', 'slug', 'links']
                        }
                    })
                },
                byCustomerId: async function (stripeCustomerId) {
                    return self.findOne({
                        where: {
                            customer: stripeCustomerId
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
