module.exports.init = function(app) {
    const stripe = require('stripe')(app.config.billing.stripe.key)

    return {
        createSubscriptionSession: async (team) => {

            const session = await stripe.checkout.sessions.create({
                mode: 'subscription',
                line_items: [{
                    price: app.config.billing.stripe.team_price,
                    quantity: 1
                }],
                subscription_data: {
                    metadata: {
                        'team': team.hashid
                    }
                },
                client_reference_id: team.hashid,
                payment_method_types: ['card'],
                success_url: `${app.config.base_url}/team/${team.slug}/overview/?billing_session={CHECKOUT_SESSION_ID}`,
                cancel_url: `${app.config.base_url}/team/${team.slug}/billing/cancel`
            })
            console.log("createSubscription", session)
            return session
        },
        addProject: async (team, project) => {
            const subscription = await app.db.models.Subscription.byTeam(team.id)

            const existingSub = await stripe.subscriptions.retrieve(subscription.subscription)
            const subItems = existingSub.items

            let projectItem = false
            subItems.data.forEach(item => {
                if (item.plan.product === app.config.billing.stripe.project_product) {
                    projectItem = item
                }
            })

            if (projectItem) {
                const metadata = projectItem.metadata ? projectItem.metadata : {}
                metadata[project.id] = 'true'
                const update = {
                    quantity: projectItem.quantity + 1,
                    proration_behavior: 'always_invoice',
                    metadata: metadata
                }
                //TODO update meta data?
                stripe.subscriptionItems.update(projectItem.id, update)
            } else {
                const metadata = {}
                metadata[project.id] = 'true'
                //metadata[team] = team.hashid
                const update = {
                    items: [{
                        price: app.config.billing.stripe.project_price,
                        quantity: 1
                    }],
                    metadata: metadata
                }
                stripe.subscriptions.update(subscription.subscription, update)
            }
        },
        removeProject: async (team, project) => {
            const subscription = await app.db.models.Subscription.byTeam(team.id)

            const existingSub = await stripe.subscriptions.retrieve(subscription.subscription)
            const subItems = existingSub.items

            let projectItem = false
            subItems.data.forEach(item => {
                if (item.plan.product === app.config.billing.stripe.project_product) {
                    projectItem = item
                }
            })

            if (projectItem) {
                const metadata = {}
                metadata[project.id] = ''
                const update = {
                    quantity: projectItem.quantity - 1,
                    metadata: metadata
                }
                if (projectItem.quantity === 1) {
                    update.proration_behavior = 'always_invoice'
                }

                try{
                    stripe.subscriptionItems.update(projectItem.id, update)
                } catch (err) {
                    console.log(err)
                }

            } else {
                //not found?
                console.log("Something wrong here")
            }
        },
        closeSubscription: async (subscription) => {
            await stripe.subscriptions.del(subscription.subscription, {
                invoice_now: true,
                prorate: true
            })
            await subscription.destroy()
        }
    }
}