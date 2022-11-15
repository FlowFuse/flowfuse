/**
 * Routes releated to the EE forge billing api
 *
 * @namespace api
 * @memberof forge.ee.billing
 */
const { Readable } = require('stream')
const { getTeamLogger } = require('../../../lib/audit-logging')

module.exports = async function (app) {
    const stripe = require('stripe')(app.config.billing.stripe.key)
    const teamAuditLog = getTeamLogger(app)
    /**
     * Need to work out what auth needs to have happend
     */
    app.addHook('preHandler', async (request, response) => {
        if (request.params.teamId) {
            request.teamMembership = await request.session.User.getTeamMembership(request.params.teamId)
            if (!request.teamMembership && !request.session.User.admin) {
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
                    app.log.error(`Stripe event failed signature: ${err.toString()}`)
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
                    app.log.error(`Stripe event received for unknown team '${teamId}'`)
                    response.status(200).send()
                    return
                }
            } else {
                if (event.type === 'charge.failed') {
                    const sub = await app.db.models.Subscription.byCustomer(customer)
                    team = sub?.Team
                }
                if (!team) {
                    app.log.error(`Stripe event received for unknown customer '${customer}'`)
                    response.status(200).send()
                    return
                }
            }

            let invoice
            let activation = false
            let invoiceItem

            switch (event.type) {
            case 'checkout.session.completed':
                // console.log(event)
                app.log.info(`Created Subscription for team ${team.hashid}`)
                await app.db.controllers.Subscription.createSubscription(team, subscription, customer)
                await teamAuditLog.billing.session.completed(request.session?.User || 0, null, team, event.data.object)
                break
            case 'checkout.session.expired':
                // should remove the team here
                app.log.info(`Stripe 'checkout.session.expired' event ${event.data.object.id} for team ${team.hashid}`)
                // console.log(event)
                break
            case 'customer.subscription.created':

                break
            case 'customer.subscription.updated':

                break
            case 'customer.subscription.deleted':

                break
            case 'charge.succeeded':
                // gate on config setting
                if (app.config.billing?.stripe?.activation_price) {
                    invoice = await stripe.invoices.retrieve(event.data.object.invoice)
                    invoice.lines.data.forEach(item => {
                        if (item.price.id === app.config.billing?.stripe?.activation_price) {
                            activation = true
                            invoiceItem = item
                        }
                    })
                    if (activation) {
                        // refund the activation test charge
                        await stripe.creditNotes.create({
                            invoice: invoice.id,
                            lines: [{
                                type: 'invoice_line_item',
                                invoice_line_item: invoiceItem.id,
                                amount: invoiceItem.amount
                            }],
                            memo: 'Activation check credit',
                            credit_amount: invoiceItem.amount
                        })
                        app.log.info(`Crediting activation fee to invoice ${invoice.id}`)
                    }
                }
                break
            case 'charge.failed':
                // TODO: This needs work, we need to count failures and susspend projects
                // after we hit a threshold (should track a charge.sucess to reset?)
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
            try {
                let cookie
                if (request.cookies.ff_coupon) {
                    cookie = request.unsignCookie(request.cookies.ff_coupon)?.valid ? request.unsignCookie(request.cookies.ff_coupon).value : undefined
                }
                const session = await app.billing.createSubscriptionSession(team, cookie) // request.session.User)
                await teamAuditLog.billing.session.created(request.session.User, null, team, session)
                response.code(402).type('application/json').send({ billingURL: session.url })
                return
            } catch (err) {
                let responseMessage
                if (err.errors) {
                    responseMessage = err.errors.map(err => err.message).join(',')
                } else {
                    responseMessage = err.toString()
                }
                response.clearCookie('ff_coupon', { path: '/' })
                response.code(402).type('appication/json').send({ error: responseMessage })
                return
            }
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
