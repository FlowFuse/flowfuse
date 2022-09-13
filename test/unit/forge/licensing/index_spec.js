const should = require('should') // eslint-disable-line
const FF_UTIL = require('flowforge-test-utils')

describe('License API', async function () {
    let app

    afterEach(async function () {
        if (app) {
            await app.close()
            app = null
        }
    })

    it('Uses default limits when no license applied', async function () {
        app = await FF_UTIL.setupApp({})
        app.license.get('users').should.equal(app.license.defaults.users)
        app.license.get('teams').should.equal(app.license.defaults.teams)
        app.license.get('projects').should.equal(app.license.defaults.projects)
        app.license.get('devices').should.equal(app.license.defaults.devices)
    })

    it('Uses license provided limits', async function () {
        /*
            License Details:
            {
                "iss": "FlowForge Inc.",
                "sub": "FlowForge Inc.",
                "nbf": 1662422400,
                "exp": 7986902399,
                "note": "Development-mode Only. Not for production",
                "users": 4,
                "teams": 5,
                "projects": 6,
                "devices": 7,
                "dev": true
            }
        */
        app = await FF_UTIL.setupApp({
            license: 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGb3JnZSBJbmMuIiwibmJmIjoxNjYyNDIyNDAwLCJleHAiOjc5ODY5MDIzOTksIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjo0LCJ0ZWFtcyI6NSwicHJvamVjdHMiOjYsImRldmljZXMiOjcsImRldiI6dHJ1ZSwiaWF0IjoxNjYyNDc2OTg5fQ.XJfAKSKH0ndmrD8z-GX1eWr7OdMnStIdP0ebtC3mKWvnT22TZK0pUx0jDMPFRROFDAJo_eh50T5OUHHfwSp1YQ'
        })
        app.license.get('users').should.equal(4)
        app.license.get('teams').should.equal(5)
        app.license.get('projects').should.equal(6)
        app.license.get('devices').should.equal(7)
    })

    it('Returns 0 for any limits if license does not include claim', async function () {
        /*
        {
            "iss": "FlowForge Inc.",
            "sub": "FlowForge Inc.",
            "nbf": 1662422400,
            "exp": 7986902399,
            "note": "Development-mode Only. Not for production",
            "dev": true
        }
        */
        const TEST_LICENSE = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGb3JnZSBJbmMuIiwibmJmIjoxNjYyNDIyNDAwLCJleHAiOjc5ODY5MDIzOTksIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsImRldiI6dHJ1ZSwiaWF0IjoxNjYyNDgxOTY4fQ.kvFn4k9zPMEX8fL_VYrr4ElarqBd8MfrRh7UtIczqfPtWynijux37KjjPZPfMTKKr1hGWvb5rejn-mmceX9NfQ'

        app = await FF_UTIL.setupApp({
            license: TEST_LICENSE
        })
        app.license.get('organisation').should.equal('FlowForge Inc.')
        app.license.get('users').should.equal(0)
        app.license.get('teams').should.equal(0)
        app.license.get('projects').should.equal(0)
        app.license.get('devices').should.equal(0)
    })
})
