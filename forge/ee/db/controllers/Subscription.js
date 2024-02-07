module.exports = {
    createSubscription: async function (app, team, subscription, customer) {
        // Check to see if there is an existing subscription for this team.
        const existingSub = await team.getSubscription()
        if (existingSub) {
            existingSub.customer = customer
            existingSub.subscription = subscription
            if (existingSub.status === app.db.models.Subscription.STATUS.TRIAL) {
                existingSub.trialEndsAt = null
                existingSub.trialStatus = app.db.models.Subscription.TRIAL_STATUS.ENDED
            }
            existingSub.status = app.db.models.Subscription.STATUS.ACTIVE
            await existingSub.save()

            // This *could* be a trial team that has devices in it. In which case,
            // we need to reconcile the subscription device count in case device billing
            // is enabled.
            await app.billing.updateTeamDeviceCount(team)
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
        const subscription = await team.getSubscription()
        if (subscription) {
            await subscription.destroy()
        }
        return null
    },

    freeTrialCreditEnabled: function (app) {
        // Team trial mode overrides team credit
        if (app.settings.get('user:team:trial-mode')) {
            return false
        }
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
    userEligibleForFreeTrialCredit: async function (app, user, newTeamAlreadyCreated = false) {
        const teamCount = await user.teamCount()

        return teamCount <= (newTeamAlreadyCreated ? 1 : 0)
    }
}
