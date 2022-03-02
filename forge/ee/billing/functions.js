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
        addProject: async (teamId, projectId) => {

            const subscription = await app.db.models.Subscription.byTeam(teamId)

            const sub = await stripe.subscriptionItems.list({
                subscription: subscription.subscription
            })

            let projectItem = false
            sub.data.forEach(item => {
                if (item.plan.product === app.config.billing.stripe.projectItem) {
                    projectItem = item
                }
            })

            if (projectItem) {
                let update = [
                    projectItem.id, {
                        quantity: projectItem.quantity + 1,
                        proration_behavior: 'always_invoice'
                    }
                ]
                //TODO update meta data?
                stripe.subscriptionItems.update(update)
            } else {
                metadata = {}
                metadata[projectId] = true
                let update = [
                    subscription.subscription, {
                        items: [{
                            price: app.config.billing.stripe.project_price,
                            quantity: 1
                        }],
                        metadata: metadata
                    }
                ]
                stripe.subscription.update(update)
            }
        },
        removeProject: async (teamId, projectId) => {
            const subscription = await app.db.models.Subscription.byTeam(teamId)

            const sub = await stripe.subscriptionItems.list({
                subscription: subscription.subscription
            })

            let projectItem = false
            sub.data.forEach(item => {
                if (item.plan.product === app.config.billing.stripe.projectItem) {
                    projectItem = item
                }
            })

            if (projectItem) {
                if (projectItem.quantity === 1) {
                    update = [
                        subscription.subscription, {
                            items: [{
                                price: app.config.billing.stripe.project_price,
                                quantity: 0,
                                proration_behavior: 'always_invoice'
                            }]
                        }
                    ]
                } else {
                    update = [
                        subscription.subscription, {
                            items: [{
                                price: app.config.billing.stripe.project_price,
                                quantity: projectItem.quantity - 1
                            }]
                        }
                    ]
                    stripe.subscription.update(update)
                }
            } else {
                //not found?
            }
        },
        closeSubscription: async (teamID) => {}
    }
}