/**
 *
 */
module.exports = async function (app) {

    const stripe = require('stripe')(app.config.billing.stripe.key)

    /**
     * Need to work out what auth needs to have happend
     */
    app.addHook('preHandler', async (request, response) => {
        if (request.params.teamId) {
            console.log("preHandler teamId", request.params.teamId)
            request.team = await app.db.models.Team.byId(request.params.teamId)
        }
    })

    /**
     */
    app.post('/callback', 
        {
            schema: {
                body: {
                    type: 'object',
                    required: ['type', 'data'],
                    properties: {
                        type: { type: 'string' },
                        data: { type: 'object' }
                    }
                }
            }
        },
        async (request, response) => {
            const sig = request.headers['stripe-signature'];
            let event = request.body
            if (app.config.billing?.stripe?.wh_secret) {
                try {
                    event = stripe.webhooks.constructEvent(event, sig, app.config.billing.stripe.wh_secret)
                } catch (err) {
                    console.log(err)
                    response.code(400).type("text/hml").send("Failed Signature")
                    return
                }
            }

            const customer = event.data.object.customer
            const subscription = event.data.object.subscription
            const teamId = event.data.object?.client_reference_id
            let team = {}
            if (teamId) {
                team = await app.db.models.Team.byId(teamId)
            }


            switch(event.type) {
                case 'checkout.session.completed':
                    console.log(event)
                    app.db.controllers.Subscription.createSubscription(team, subscription, customer)
                    break;
                case 'checkout.session.expired':

                    break;
                case 'customer.subscription.created':
                    
                    break;
                case 'customer.subscription.updated':

                    break;
                case 'customer.subscription.deleted':

                    break;
                case 'charge.failed':

                    break;

            }

            response.code(200).send()
        }
    )

    /**
     */
    app.get('/customer-portal/:teamId', async (request, response) => {
        const team = request.team
        const portal = await stripe.billingPortal.sessions.create({
            customer: '',
            return_url: `${app.config.base_url}/team/${team.slug}/overview`
        })

        reply.redirect(303, portal.url)
    })


    // app.post('/teams', 
    //     {
    //         schema: {
    //             body: {
    //                 type: 'object',
    //                 required: [ 'teamId' ],
    //                 properties: {
    //                     teamId: { type: 'string' }
    //                 }
    //             }
    //         }
    //     },
    //     async (request, response) => {
    //     const teamId = request.body.teamId
    //     const team = await app.db.models.byId(teamId)
    //     const session = await stripe.checkout.sessions.create({
    //         mode: 'subscription',
    //         line_items: [{
    //             price: app.config.billing.stripe.team_price,
    //             quantity: 1
    //         }],
    //         subscription_data: { metadata: { 'team': teamId }},
    //         payment_method_types: [ 'card' ],
    //         success_url: `${app.config.base_url}/team/${team.slug}/billing/?session={CHECKOUT_SESSION_ID}`,
    //         cancel_url: `${app.config.base_url}/team/${team.slug}/billing/cancel`
    //     })
    // })

    app.get('/teams/:teamId', async (request, response) => {
        const team = request.team
    })

    // app.delete('/teams/:teamId', async (request, response) => {
    //     const team = request.team
    // })

    /**
     */
    // app.post('/teams/:teamId/projects',
    //     {
    //         schema: {
    //             body: {
    //                 type: 'object',
    //                 required: [ 'projectId' ],
    //                 properties: {
    //                     projectId: { type: 'string' }
    //                 }
    //             }
    //         }
    //     },
    //     async (request, response) => {
    //         const projectId = request.body.projectId
    //         const project = await app.db.models.Project.byId(projectId)
    //         const subscription = await app.db.models.Subscription.byTeam(request.team.id)

    //         const sub = await stripe.subscriptionItems.list({
    //             subscription: subscription.subscription
    //         })

    //         let projectItem = false
    //         sub.data.forEach(item => {
    //             if ( item.plan.product === app.config.billing.stripe.projectItem ) {
    //                 projectItem = item
    //             }
    //         })

    //         if (projectItem) {
    //             let update = [
    //                 projectItem.id,
    //                 {
    //                     quantity: projectItem.quantity + 1,
    //                     proration_behavior : 'always_invoice'
    //                 }
    //             ]
    //             stripe.subscriptionItems.update(update)
    //         } else {
    //             let update = [
    //                 subscription.subscription,
    //                 {
    //                     items: [{
    //                         price: app.config.billing.stripe.project_price,
    //                         quantity: 1
    //                     }],
    //                     metadata: { projectId :'true'}
    //                 }
    //             ]
    //             stripe.subscription.update(update)
    //         }
    // })

    // /**
    //  */
    // app.delete('/teams/:teamId/projects/:projectId', async (request, response) => {

    // })
}