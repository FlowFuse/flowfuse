
module.exports = {
    createSubscription: async function (app, team, subscription, customer) {
        // Check to see if there is an existing subscription for this team.
        const existingSub = await app.db.models.Subscription.byTeamId(team.id)
        if (existingSub) {
            existingSub.customer = customer
            existingSub.subscription = subscription
            existingSub.status = app.db.models.Subscription.STATUS.ACTIVE
            await existingSub.save()
            return existingSub
        } else {
            // Create the subscription
            const newSubscription = await app.db.models.Subscription.create({
                customer,
                subscription
            })
            await newSubscription.setTeam(team)

            return newSubscription
        }
    },
    createTrialSubscription: async function (app, team, trialEndsAt) {
        const newSubscription = await app.db.models.Subscription.create({
            customer: '',
            subscription: '',
            status: app.db.models.Subscription.STATUS.TRIAL,
            trialStatus: app.db.models.Subscription.TRIAL_STATUS.CREATED,
            trialEndsAt
        })
        await newSubscription.setTeam(team)
        return newSubscription
    },
    deleteSubscription: async function (app, team) {
        const subscription = await app.db.models.Subscription.byTeamId(team.id)
        if (subscription) {
            subscription.destroy()
        }
        return null
    },

    freeTrialsEnabled: function (app) {
        const creditAmount = app.config.billing?.stripe?.new_customer_free_credit
        if (!creditAmount) {
            return false
        }

        if (creditAmount <= 0) {
            app.log.error('new_customer_free_credit must be set to a cent value greater than zero, disabling free trials.')
            return false
        }

        return true
    },

    // Users are only eligible for the free trial if they're not part of any team
    // newTeamAlreadyCreated is required during subscription creation as the team is created before the subscription
    userEligibleForFreeTrial: async function (app, user, newTeamAlreadyCreated = false) {
        const teamCount = await user.teamCount()

        return teamCount <= (newTeamAlreadyCreated ? 1 : 0)
    }
}
