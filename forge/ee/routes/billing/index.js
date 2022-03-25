/**
 * Routes releated to the EE forge billing api
 *
 * @namespace api
 * @memberof forge.ee.billing
 */
const { Readable } = require('stream')

module.exports = async function (app) {
    const stripe = require('stripe')(app.config.billing.stripe.key)

    /**
     * Need to work out what auth needs to have happend
     */
    app.addHook('preHandler', async (request, response) => {
        if (request.params.teamId) {
            request.teamMembership = await request.session.User.getTeamMembership(request.params.teamId)
            if (!request.teamMembership) {
                response.code(404).type('text/html').send('Not Found')
            }
            request.team = await app.db.models.Team.byId(request.params.teamId)
            if (!request.team) {
                response.code(404).type('text/html').send('Not Found')
            }
        }
    })

    /**
     * Callback for Stripe to report events
     * @name /ee/billing/callback
     * @static
     * @memberof forge.ee.billing
     */
    app.post('/callback',
        {
            config: {
                allowAnonymous: true
            },
            preParsing: function (request, reply, payload, done) {
                const chunks = []
                payload.on('data', chunk => {
                    chunks.push(chunk)
                })
                payload.on('end', () => {
                    const raw = Buffer.concat(chunks)
                    request.rawBody = raw
                    done(null, Readable.from(raw))
                })
            },
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
            const sig = request.headers['stripe-signature']
            let event = request.body
            if (app.config.billing?.stripe?.wh_secret) {
                try {
                    event = stripe.webhooks.constructEvent(request.rawBody, sig, app.config.billing.stripe.wh_secret)
                } catch (err) {
                    console.log(err)
                    response.code(400).type('text/hml').send('Failed Signature')
                    return
                }
            }

            const customer = event.data.object.customer
            const subscription = event.data.object.subscription
            const teamId = event.data.object?.client_reference_id
            let team = {}
            if (teamId) {
                team = await app.db.models.Team.byId(teamId)
                if (!team) {
                    response.status(404).type('text/html').send('Not Found')
                    return
                }
            } else {
                response.status(404).type('text/html').send('Not Found')
                return
            }

            switch (event.type) {
            case 'checkout.session.completed':
                // console.log(event)
                app.log.info(`Created Subscription for team ${team.hashid}`)
                await app.db.controllers.Subscription.createSubscription(team, subscription, customer)
                // app.db.controllers.AuditLog.teamLog({
                //     team.id,
                //     user.id,
                //     'billing.session.created',
                //     { session: session.id }
                // })
                break
            case 'checkout.session.expired':
                // should remove the team here
                console.log('checkout.session.expired')
                console.log(event)
                break
            case 'customer.subscription.created':

                break
            case 'customer.subscription.updated':

                break
            case 'customer.subscription.deleted':

                break
            case 'charge.failed':
                // This needs work
                break
            }

            response.code(200).send()
        }
    )

    /**
     * Get Billing details for a team
     * @name /ee/billing/teams/:team
     * @static
     * @memberof forge.ee.billing
     */
    app.get('/teams/:teamId', {
        preHandler: app.needsPermission('team:edit')
    }, async (request, response) => {
        const team = request.team
        const sub = await app.db.models.Subscription.byTeam(team.id)
        if (!sub) {
            const session = await app.billing.createSubscriptionSession(team, '') // request.session.User)
            response.code(404).type('application/json').send({ billingURL: session.url })
            return
        }

        const stripeSubscription = await stripe.subscriptions.retrieve(
            sub.subscription,
            {
                expand: ['items.data.price.product']
            }
        )

        const information = {
            next_billing_date: stripeSubscription.current_period_end,
            items: []
        }
        stripeSubscription.items.data.forEach(item => {
            information.items.push({
                name: item.price.product.name,
                price: item.price.unit_amount,
                quantity: item.quantity
            })
        })

        response.status(200).send(information)
    })

    /**
     * Redirect to the Stripe Customer portal
     * @name /ee/billing/teams/:team/customer-portal
     * @static
     * @memberof forge.ee.billing
     */
    app.get('/teams/:teamId/customer-portal', {
        preHandler: app.needsPermission('team:edit')
    }, async (request, response) => {
        const team = request.team
        const sub = await app.db.models.Subscription.byTeam(team.id)
        const portal = await stripe.billingPortal.sessions.create({
            customer: sub.customer,
            return_url: `${app.config.base_url}/team/${team.slug}/overview`
        })

        response.redirect(303, portal.url)
    })
}
