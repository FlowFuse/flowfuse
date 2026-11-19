const should = require('should') // eslint-disable-line no-unused-vars

const FF_UTIL = require('flowforge-test-utils')

describe('Expert Insights MQTT feature flag', function () {
    const license = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGb3JnZSBJbmMuIERldmVsb3BtZW50IiwibmJmIjoxNjYyNDIyNDAwLCJleHAiOjc5ODY5MDIzOTksIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxNTAsInRlYW1zIjo1MCwicHJvamVjdHMiOjUwLCJkZXZpY2VzIjo1MCwiZGV2Ijp0cnVlLCJpYXQiOjE2NjI0ODI5ODd9.e8Jeppq4aURwWYz-rEpnXs9RY2Y7HF7LJ6rMtMZWdw2Xls6-iyaiKV1TyzQw5sUBAhdUSZxgtiFH5e_cNJgrUg'
    let app

    async function setupApp (expert) {
        app = await FF_UTIL.setupApp({
            license,
            housekeeper: false,
            expert: {
                enabled: true,
                service: { url: 'http://localhost:9999', token: 'test-token' },
                ...expert
            }
        })
        return app.config.features.getPublicFeatures().expertInsightsMqtt
    }

    afterEach(async function () {
        await app?.close()
        app = null
    })

    it('is on when the Expert bridge is configured', async function () {
        const flag = await setupApp({ centralBroker: { server: 'expert-broker.example.com:8883' } })
        flag.should.be.true()
    })

    it('is off without the Expert bridge', async function () {
        const flag = await setupApp({})
        flag.should.be.false()
    })

    it('can be turned off with the Expert bridge configured', async function () {
        const flag = await setupApp({ centralBroker: { server: 'expert-broker.example.com:8883' }, insights: { mqtt: false } })
        flag.should.be.false()
    })

    it('is off when insights are disabled', async function () {
        const flag = await setupApp({ centralBroker: { server: 'expert-broker.example.com:8883' }, insights: { enabled: false } })
        flag.should.be.false()
    })
})
