const should = require('should')
const setup = require('../../setup')

describe('Stripe Callbacks', function () {
    let app

    const callbackURL = '/ee/billing/callback'

    // const chargeFailedPayload = '{\n' +
    // '    "id": "evt_123456790",\n' +
    // '    "object": "event",\n' +
    // '    "data": {\n' +
    // '        "object": {\n' +
    // '            "id": "ch_1234567890",\n' +
    // '            "customer": "cus_1234567890"\n' +
    // '        }\n' +
    // '    },\n' +
    // '    "type": "charge.failed"\n' +
    // '}'

    beforeEach(async function () {
        app = await setup()
    })

    afterEach(async function () {
        await app.close()
    })

    it('Receive charge.failed callback', async function () {
        const response = await app.inject({
            method: 'POST',
            url: callbackURL,
            headers: {
                // "stripe-signature" : "",
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
        should(response).have.property('statusCode', 200)
    })

    it('Receive charge.failed callback for unknown customer', async function () {
        const response = await app.inject({
            method: 'POST',
            url: callbackURL,
            headers: {
                // "stripe-signature" : "",
                'content-type': 'application/json'
            },
            payload: {
                id: 'evt_123456790',
                object: 'event',
                data: {
                    object: {
                        id: 'ch_1234567890',
                        customer: 'cus_0987654321'
                    }
                },
                type: 'charge.failed'
            }
        })
        should(response).have.property('statusCode', 200)
    })

    it('Receive checkout.session.completed callback', async function () {
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
