const should = require('should')
const sinon = require('sinon')
const setup = require('../../setup')

describe('Stripe Callbacks', function () {
    const sandbox = sinon.createSandbox()

    let app

    const callbackURL = '/ee/billing/callback'

    beforeEach(async function () {
        app = await setup()
        sandbox.spy(app.log)
    })

    afterEach(async function () {
        await app.close()
        sandbox.restore()
    })

    describe('charge.failed', () => {
        it('Handles known customer', async function () {
            const response = await app.inject({
                method: 'POST',
                url: callbackURL,
                headers: {
                    'content-type': 'application/json'
                },
                payload: {
                    id: 'evt_123456790',
                    object: 'event',
                    data: {
                        object: {
                            id: 'ch_1234567890',
                            customer: 'cus_1234567890'
                        }
                    },
                    type: 'charge.failed'
                }
            })

            should(app.log.info.called).equal(true)
            app.log.info.lastCall.firstArg.should.equal(`Stripe charge.failed event ch_1234567890 received for team '${app.team.hashid}'`)

            should(response).have.property('statusCode', 200)
        })

        it('Logs and does not throw an error for unknown customer', async function () {
            const response = await app.inject({
                method: 'POST',
                url: callbackURL,
                headers: {
                    'content-type': 'application/json'
                },
                payload: {
                    id: 'evt_123456790',
                    object: 'event',
                    data: {
                        object: {
                            id: 'ch_1234567890',
                            customer: 'cus_does_not_exist'
                        }
                    },
                    type: 'charge.failed'
                }
            })

            should(app.log.error.called).equal(true)
            app.log.error.lastCall.firstArg.should.equal("Stripe charge.failed event ch_1234567890 received for unknown team 'cus_does_not_exist'")

            should(response).have.property('statusCode', 200)
        })
    })

    describe('checkout.session.completed', () => {
        it('Creates a subscription locally', async function () {
            const response = await (app.inject({
                method: 'POST',
                url: callbackURL,
                headers: {
                    'content-type': 'application/json'
                },
                payload: {
                    id: 'evt_123456790',
                    object: 'event',
                    data: {
                        object: {
                            id: 'cs_1234567890',
                            object: 'checkout.session',
                            customer: 'cus_0987654321',
                            subscription: 'sub_0987654321',
                            client_reference_id: app.team.hashid
                        }
                    },
                    type: 'checkout.session.completed'
                }
            }))
            should(app.log.info.called).equal(true)
            app.log.info.firstCall.firstArg.should.equal(`Stripe checkout.session.completed event cs_1234567890 received for team '${app.team.hashid}'`)

            should(response).have.property('statusCode', 200)
            const sub = await app.db.models.Subscription.byCustomer('cus_0987654321')
            should(sub.customer).equal('cus_0987654321')
            should(sub.subscription).equal('sub_0987654321')
            const team = sub.Team
            should(team.name).equal('ATeam')
        })
    })

    describe('checkout.session.expired', () => {
        it('Logs and does not throw an error', async () => {
            const response = await (app.inject({
                method: 'POST',
                url: callbackURL,
                headers: {
                    'content-type': 'application/json'
                },
                payload: {
                    id: 'evt_123456790',
                    object: 'event',
                    data: {
                        object: {
                            id: 'cs_1234567890',
                            object: 'checkout.session',
                            customer: 'cus_1234567890',
                            subscription: 'sub_0987654321',
                            status: 'expired'
                        }
                    },
                    type: 'checkout.session.expired'
                }
            }))

            should(app.log.info.called).equal(true)
            app.log.info.firstCall.firstArg.should.equal(`Stripe checkout.session.expired event cs_1234567890 received for team '${app.team.hashid}'`)

            should(response).have.property('statusCode', 200)
        })
    })
})
