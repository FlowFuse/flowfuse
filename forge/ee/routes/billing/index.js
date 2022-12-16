/**
 * Routes related to the EE forge billing api
 *
 * @namespace api
 * @memberof forge.ee.billing
 */
const { Readable } = require('stream')

module.exports = async function (app) {
    const stripe = require('stripe')(app.config.billing.stripe.key)

    function logStripeEvent (event, team, teamId = null) {
        if (team) {
            app.log.info(`Stripe ${event.type} event ${event.data.object.id} received for team '${team.hashid}'`)
        } else {
            app.log.error(`Stripe ${event.type} event ${event.data.object.id} received for unknown team '${teamId}'`)
        }
    }

    async function parseChargeEvent (event) {
        const stripeCustomerId = event.data.object.customer
        const subscription = await app.db.models.Subscription.byCustomerId(stripeCustomerId)
        const team = subscription?.Team

        logStripeEvent(event, team, stripeCustomerId)

        return {
            stripeCustomerId, subscription, team
        }
    }

    async function parseCheckoutEvent (event) {
        const stripeCustomerId = event.data.object.customer
        const stripeSubscriptionId = event.data.object.subscription
        const teamId = event.data.object?.client_reference_id

        let team
        if (teamId) {
            team = await app.db.models.Team.byId(teamId)
            logStripeEvent(event, team, teamId)
        } else {
            const subscription = await app.db.models.Subscription.byCustomerId(stripeCustomerId)
            team = subscription?.Team
            logStripeEvent(event, team, stripeCustomerId)
        }

        return {
            stripeSubscriptionId, stripeCustomerId, team
        }
    }

    async function parseSubscriptionEvent (event) {
        const stripeSubscriptionId = event.data.object.id
        const stripeCustomerId = event.data.object.customer
        const subscription = await app.db.models.Subscription.byCustomerId(stripeCustomerId)
        const team = subscription?.Team

        logStripeEvent(event, team, stripeCustomerId)

        return {
            stripeSubscriptionId, stripeCustomerId, subscription, team
        }
    }

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

            switch (event.type) {
            case 'charge.failed': {
                await parseChargeEvent(event)

                // Do nothing - just log event (handled above)

                break
            }

            case 'checkout.session.completed': {
                const { team, stripeSubscriptionId, stripeCustomerId } = await parseCheckoutEvent(event)
                if (!team) {
                    response.status(200).send()
                    return
                }

                await app.db.controllers.Subscription.createSubscription(team, stripeSubscriptionId, stripeCustomerId)
                await app.auditLog.Team.billing.session.completed(request.session?.User || 'system', null, team, event.data.object)

                app.log.info(`Created Subscription for team ${team.hashid}`)

                break
            }

            case 'checkout.session.expired': {
                await parseCheckoutEvent(event)

                // Do nothing - just log (handled above)

                break
            }

            case 'customer.subscription.created': {
                await parseSubscriptionEvent(event)

                // Do nothing - just log (handled above)

                break
            }

            case 'customer.subscription.updated': {
                const { stripeSubscriptionId, subscription } = await parseSubscriptionEvent(event)
                if (!subscription) {
                    response.status(200).send()
                    return
                }

                const stripeSubscriptionStatus = event.data.object.status
                if (Object.values(app.db.models.Subscription.STATUS).includes(stripeSubscriptionStatus)) {
                    subscription.status = stripeSubscriptionStatus
                    await subscription.save()
                } else {
                    app.log.warn(`Stripe subscription ${stripeSubscriptionId} has transitioned in Stripe to a state not currently handled: '${stripeSubscriptionStatus}'`)
                }

                break
            }

            case 'customer.subscription.deleted': {
                const { team, subscription } = await parseSubscriptionEvent(event)
                if (!team) {
                    response.status(200).send()
                    return
                }

                // Cancel our copy of the subscription
                subscription.status = app.db.models.Subscription.STATUS.CANCELED
                await subscription.save()

                // Suspend all projects of that team
                const projects = await app.db.models.Project.byTeam(team.hashid)
                await Promise.all(projects.map(async (project) => {
                    app.log.info(`Stopping project ${project.id} from team ${team.hashid}`)
                    if (await app.containers.stop(project)) {
                        await app.auditLog.Project.project.suspended(request.session?.User || 'system', null, project)
                    }
                }))

                app.log.info(`Suspended all projects for team ${team.hashid}`)

                // to-do: Suspend all devices and their updates - we think this happens automatically
                // to-do: Downgrade the team type (if possible)

                break
            }
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
        const sub = await app.db.models.Subscription.byTeamId(team.id)
        if (!sub) {
            return response.code(404).send({ code: 'not_found', error: 'Team does not have a subscription' })
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
     * Set up new billing subscription for a team
     * @name /ee/billing/teams/:team
     * @static
     * @memberof forge.ee.billing
     */
    app.post('/teams/:teamId', {
        preHandler: app.needsPermission('team:edit')
    }, async (request, response) => {
        const team = request.team
        try {
            let coupon
            if (request.cookies.ff_coupon) {
                coupon = request.unsignCookie(request.cookies.ff_coupon)?.valid ? request.unsignCookie(request.cookies.ff_coupon).value : undefined
            }
            const session = await app.billing.createSubscriptionSession(team, coupon, request.session.User)
            await app.auditLog.Team.billing.session.created(request.session.User, null, team, session)
            response.code(200).type('application/json').send({ billingURL: session.url })
        } catch (err) {
            // Likely invalid coupon error from stripe
            if (err.code === 'resource_missing') {
                response.clearCookie('ff_coupon', { path: '/' })
                response.code(400).send({ code: 'invalid_coupon', error: err.toString() })
                return
            }

            // Standard errors
            let responseMessage
            if (err.errors) {
                responseMessage = err.errors.map(err => err.message).join(',')
            } else {
                responseMessage = err.toString()
            }

            // Catch all
            response.code(500).type('application/json').send({ code: 'unexpected_error', error: responseMessage })
        }
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
        const sub = await app.db.models.Subscription.byTeamId(team.id)
        const portal = await stripe.billingPortal.sessions.create({
            customer: sub.customer,
            return_url: `${app.config.base_url}/team/${team.slug}/overview`
        })

        response.redirect(303, portal.url)
    })
}
