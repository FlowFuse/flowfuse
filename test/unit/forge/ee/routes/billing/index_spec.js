const should = require('should')
const setup = require('../../setup')

describe('Stripe Callbacks', function () {
    let app

    const callbackURL = '/ee/billing/callback'

    beforeEach(async function () {
        app = await setup()
    })

    afterEach(async function () {
        await app.close()
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
            // Should do nothing but return a 200
            should(response).have.property('statusCode', 200)
        })

        it('Does not throw an error for unknown customer', async function () {
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
            // Should do nothing but return a 200
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
            should(response).have.property('statusCode', 200)
            const sub = await app.db.models.Subscription.byCustomer('cus_0987654321')
            should(sub.customer).equal('cus_0987654321')
            should(sub.subscription).equal('sub_0987654321')
            const team = sub.Team
            should(team.name).equal('ATeam')
        })
    })
    })
})
