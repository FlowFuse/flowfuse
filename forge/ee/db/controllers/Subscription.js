
module.exports = {
    createSubscription: async function (app, team, subscription, customer) {
        const newSubscription = await app.db.models.Subscription.create({
            customer,
            subscription
        })
        await newSubscription.setTeam(team)

        return newSubscription
    },
    deleteSubscription: async function (app, team) {
        const subscription = await app.db.models.Subscription.byTeam(team.id)
        if (subscription) {
            subscription.destroy()
        }
        return null
    }
}
