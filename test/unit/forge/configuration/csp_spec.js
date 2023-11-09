const should = require('should') // eslint-disable-line

const FF_UTIL = require('flowforge-test-utils')

describe.only('Check CSP values parsed', async () => {
    let app

    afterEach(async function () {
        await app.close()
    })

    it('CSP Report only should be enabled', async function () {
        const config = {
            content_security_policy: {
                enabled: true,
                report_only: true,
                report_uri: 'https://example.com'
            }
        }
        app = await FF_UTIL.setupApp(config)

        const response = await app.inject({
            method: 'GET',
            url: '/'
        })

        const headers = response.headers
        headers.should.have.property('content-security-policy-report-only')
        const csp = response.headers['content-security-policy-report-only']
        csp.split(';').should.containEql('report-uri https://example.com')
    })

    it('CSP should be enabled', async function () {
        const config = {
            content_security_policy: {
                enabled: true
            }
        }
        app = await FF_UTIL.setupApp(config)
        const response = await app.inject({
            method: 'GET',
            url: '/'
        })

        const headers = response.headers
        headers.should.have.property('content-security-policy')
        const csp = response.headers['content-security-policy']
    })
})
