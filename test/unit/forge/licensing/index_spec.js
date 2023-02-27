const should = require('should') // eslint-disable-line
const FF_UTIL = require('flowforge-test-utils')

describe('License API', async function () {
    let app
    /**
    * Test license with: "users": 4, "teams": 5, "projects": 6, "devices": 7, "dev": true
    *
    * Details:
    * ```
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
    * ```
    */
    const TEST_LICENSE_4u_5t_6p_7d = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGb3JnZSBJbmMuIiwibmJmIjoxNjYyNDIyNDAwLCJleHAiOjc5ODY5MDIzOTksIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjo0LCJ0ZWFtcyI6NSwicHJvamVjdHMiOjYsImRldmljZXMiOjcsImRldiI6dHJ1ZSwiaWF0IjoxNjYyNDc2OTg5fQ.XJfAKSKH0ndmrD8z-GX1eWr7OdMnStIdP0ebtC3mKWvnT22TZK0pUx0jDMPFRROFDAJo_eh50T5OUHHfwSp1YQ' // eslint-disable-line camelcase

    /**
    * Test license (does not include any claims)
    *
    * Details:
    * ```
    * {
    *   "iss": "FlowForge Inc.",
    *   "sub": "FlowForge Inc.",
    *   "nbf": 1662422400,
    *   "exp": 7986902399,
    *   "note": "Development-mode Only. Not for production",
    *   "dev": true
    * }
    * ```
    */
    const TEST_LICENSE_0_CLAIMS = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGb3JnZSBJbmMuIiwibmJmIjoxNjYyNDIyNDAwLCJleHAiOjc5ODY5MDIzOTksIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsImRldiI6dHJ1ZSwiaWF0IjoxNjYyNDgxOTY4fQ.kvFn4k9zPMEX8fL_VYrr4ElarqBd8MfrRh7UtIczqfPtWynijux37KjjPZPfMTKKr1hGWvb5rejn-mmceX9NfQ' // eslint-disable-line camelcase

    /**
     * Get the forge application (licensed or unlicensed)
     * @param {String} [license] (optional) The license to use. If null, use the default license
     * @returns the forge application
     */
    async function getApp (license) {
        if (!license) {
            return await FF_UTIL.setupApp({ license })
        }
        return await FF_UTIL.setupApp({ license })
    }

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

    it('Gets all usage count and limits (unlicensed)', async function () {
        app = await getApp() // unlicensed
        const usage = await app.license.usage()
        // check usage contains the correct keys
        usage.should.only.have.keys('users', 'teams', 'projects', 'devices')
        // check each item has the correct keys
        usage.users.should.only.have.keys('resource', 'count', 'limit')
        usage.teams.should.only.have.keys('resource', 'count', 'limit')
        usage.projects.should.only.have.keys('resource', 'count', 'limit')
        usage.devices.should.only.have.keys('resource', 'count', 'limit')
        // check usage values are correct
        usage.users.count.should.equal(0)
        usage.users.limit.should.equal(app.license.defaults.users)
        usage.users.resource.should.equal('users')

        usage.teams.count.should.equal(0)
        usage.teams.limit.should.equal(app.license.defaults.teams)
        usage.teams.resource.should.equal('teams')

        usage.projects.count.should.equal(0)
        usage.projects.limit.should.equal(app.license.defaults.projects)
        usage.projects.resource.should.equal('projects')

        usage.devices.count.should.equal(0)
        usage.devices.limit.should.equal(app.license.defaults.devices)
        usage.devices.resource.should.equal('devices')
    })
    it('Gets users usage count and limit only (unlicensed)', async function () {
        app = await getApp() // unlicensed
        const usage = await app.license.usage('users')
        // check usage contains the correct keys
        usage.should.only.have.keys('users')
        // check item has the correct keys
        usage.users.should.only.have.keys('resource', 'count', 'limit')
        usage.users.count.should.equal(0)
        usage.users.limit.should.equal(app.license.defaults.users)
        usage.users.resource.should.equal('users')
    })
    it('Gets teams usage count and limit only (unlicensed)', async function () {
        app = await getApp() // unlicensed
        const usage = await app.license.usage('teams')
        // check usage contains the correct keys
        usage.should.only.have.keys('teams')
        // check item has the correct keys
        usage.teams.should.only.have.keys('resource', 'count', 'limit')
        usage.teams.count.should.equal(0)
        usage.teams.limit.should.equal(app.license.defaults.teams)
        usage.teams.resource.should.equal('teams')
    })
    it('Gets projects usage count and limit only (unlicensed)', async function () {
        app = await getApp() // unlicensed
        const usage = await app.license.usage('projects')
        // check usage contains the correct keys
        usage.should.only.have.keys('projects')
        // check item has the correct keys
        usage.projects.should.only.have.keys('resource', 'count', 'limit')
        usage.projects.count.should.equal(0)
        usage.projects.limit.should.equal(app.license.defaults.projects)
        usage.projects.resource.should.equal('projects')
    })
    it('Gets devices usage count and limit only (unlicensed)', async function () {
        app = await getApp() // unlicensed
        const usage = await app.license.usage('devices')
        // check usage contains the correct keys
        usage.should.only.have.keys('devices')
        // check item has the correct keys
        usage.devices.should.only.have.keys('resource', 'count', 'limit')
        usage.devices.count.should.equal(0)
        usage.devices.limit.should.equal(app.license.defaults.devices)
        usage.devices.resource.should.equal('devices')
    })

    it('Gets all usage count and limits (licensed)', async function () {
        app = await getApp(TEST_LICENSE_4u_5t_6p_7d) // licensed
        const usage = await app.license.usage()
        // check usage contains the correct keys
        usage.should.only.have.keys('users', 'teams', 'projects', 'devices')
        // check each item has the correct keys
        usage.users.should.only.have.keys('resource', 'count', 'limit')
        usage.teams.should.only.have.keys('resource', 'count', 'limit')
        usage.projects.should.only.have.keys('resource', 'count', 'limit')
        usage.devices.should.only.have.keys('resource', 'count', 'limit')
        // check usage values are correct
        usage.users.count.should.equal(0)
        usage.users.limit.should.equal(4)
        usage.users.resource.should.equal('users')

        usage.teams.count.should.equal(0)
        usage.teams.limit.should.equal(5)
        usage.teams.resource.should.equal('teams')

        usage.projects.count.should.equal(0)
        usage.projects.limit.should.equal(6)
        usage.projects.resource.should.equal('projects')

        usage.devices.count.should.equal(0)
        usage.devices.limit.should.equal(7)
        usage.devices.resource.should.equal('devices')
    })
    it('Gets users usage count and limit only (licensed)', async function () {
        app = await getApp(TEST_LICENSE_4u_5t_6p_7d) // licensed
        const usage = await app.license.usage('users')
        // check usage contains the correct keys
        usage.should.only.have.keys('users')
        // check item has the correct keys
        usage.users.should.only.have.keys('resource', 'count', 'limit')
        usage.users.count.should.equal(0)
        usage.users.limit.should.equal(4)
        usage.users.resource.should.equal('users')
    })
    it('Gets teams usage count and limit only (licensed)', async function () {
        app = await getApp(TEST_LICENSE_4u_5t_6p_7d) // licensed
        const usage = await app.license.usage('teams')
        // check usage contains the correct keys
        usage.should.only.have.keys('teams')
        // check item has the correct keys
        usage.teams.should.only.have.keys('resource', 'count', 'limit')
        usage.teams.count.should.equal(0)
        usage.teams.limit.should.equal(5)
        usage.teams.resource.should.equal('teams')
    })
    it('Gets projects usage count and limit only (licensed)', async function () {
        app = await getApp(TEST_LICENSE_4u_5t_6p_7d) // licensed
        const usage = await app.license.usage('projects')
        // check usage contains the correct keys
        usage.should.only.have.keys('projects')
        // check item has the correct keys
        usage.projects.should.only.have.keys('resource', 'count', 'limit')
        usage.projects.count.should.equal(0)
        usage.projects.limit.should.equal(6)
        usage.projects.resource.should.equal('projects')
    })
    it('Gets devices usage count and limit only (licensed)', async function () {
        app = await getApp(TEST_LICENSE_4u_5t_6p_7d)
        const usage = await app.license.usage('devices')
        // check usage contains the correct keys
        usage.should.only.have.keys('devices')
        // check item has the correct keys
        usage.devices.should.only.have.keys('resource', 'count', 'limit')
        usage.devices.count.should.equal(0)
        usage.devices.limit.should.equal(7)
        usage.devices.resource.should.equal('devices')
    })

    it('Returns 0 as the limit property when querying usage data for a license without claims', async function () {
        app = await getApp(TEST_LICENSE_0_CLAIMS)
        app.license.get('organisation').should.equal('FlowForge Inc.')
        const usage = await app.license.usage()
        usage.should.only.have.keys('users', 'teams', 'projects', 'devices')
        usage.users.limit.should.equal(0)
        usage.teams.limit.should.equal(0)
        usage.projects.limit.should.equal(0)
        usage.devices.limit.should.equal(0)
    })

    it('Uses license provided limits', async function () {
        app = await getApp(TEST_LICENSE_4u_5t_6p_7d)
        app.license.get('organisation').should.equal('FlowForge Inc.')
        app.license.get('users').should.equal(4)
        app.license.get('teams').should.equal(5)
        app.license.get('projects').should.equal(6)
        app.license.get('devices').should.equal(7)
    })

    it('Returns 0 for any limits if license does not include claim', async function () {
        app = await getApp(TEST_LICENSE_0_CLAIMS)
        app.license.get('organisation').should.equal('FlowForge Inc.')
        app.license.get('users').should.equal(0)
        app.license.get('teams').should.equal(0)
        app.license.get('projects').should.equal(0)
        app.license.get('devices').should.equal(0)
    })
})
