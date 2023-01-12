
module.exports = {
    createSubscription: async function (app, team, subscription, customer) {
        // Replace any existing subscription for this team
        await this.deleteSubscription(app, team)

        // Create the subscription
        const newSubscription = await app.db.models.Subscription.create({
            customer,
            subscription
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
