
module.exports = {
    createSubscription: async function (app, team, subscription, customer) {
        const newSubscription = await app.db.models.Subscription.create({
            customer: customer,
            subscription: subscription
        })
        await newSubscription.setTeam(team)

        return newSubscription
    },
    deleteSubscription: async function (app, team) {
        const subscription = app.db.models.Subscription.byTeam(team)
        if (subscription) {
            subscription.destroy()
        }
        return null
    }
}
