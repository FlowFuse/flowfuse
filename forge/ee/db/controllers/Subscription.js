
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

    userEligibleForFreeTrial: async function (app, user, newTeamAlreadyCreated = false) {
        const teams = await app.db.models.Team.forUser(user)
        const totalTeams = teams.length

        return totalTeams <= newTeamAlreadyCreated ? 1 : 0
    }
}
