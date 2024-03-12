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
     * Test license: users 4, teams 5, instances 13
     * {
            "id": "87f0474c-c721-4332-851f-3cd92736497f",
            "ver": "2024-03-04",
            "iss": "FlowForge Inc.",
            "sub": "FlowFuse Development",
            "nbf": 1709596800,
            "exp": 4107888000,
            "note": "Development-mode Only. Not for production",
            "users": 4,
            "teams": 5,
            "instances": 13,
            "tier": "enterprise",
            "dev": true
        }
    */
    const TEST_LICENSE_4u_5t_13i = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijg3ZjA0NzRjLWM3MjEtNDMzMi04NTFmLTNjZDkyNzM2NDk3ZiIsInZlciI6IjIwMjQtMDMtMDQiLCJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGdXNlIERldmVsb3BtZW50IiwibmJmIjoxNzA5NTk2ODAwLCJleHAiOjQxMDc4ODgwMDAsIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjo0LCJ0ZWFtcyI6NSwiaW5zdGFuY2VzIjoxMywidGllciI6ImVudGVycHJpc2UiLCJkZXYiOnRydWUsImlhdCI6MTcwOTY0NjI1M30.X-m4iLzXc5ivBABljZT6pMvYNoqhGYQHU1dMfPVhahkekRPZVSZT1IGKjMMBc8YVZwRoHYuoxjiOmpPyto6_CA' // eslint-disable-line camelcase

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
    * Test License with tier: teams
    *
    * Details:
    * ```
    * {
    *   "id": "afb0e083-e560-4c07-a919-87dd775bb7a8",
    *   "iss": "FlowForge Inc.",
    *   "sub": "FlowForge Inc.",
    *   "nbf": 1694649600,
    *   "exp": 32503680000,,
    *   "note": "Development-mode Only. Not for production",
    *   "users": 150,
    *   "teams": 50,
    *   "projects": 50,
    *   "devices": 50,
    *   "tier": "teams",
    *   "dev": true
    * }
    * ```
    */
    const TEST_LICENSE_TEAM = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjQyOWE5ZjM1LTA3ZmMtNDlmYy1iNGY5LTA3MjY0ZGQxOTE2MCIsImlzcyI6IkZsb3dGb3JnZSBJbmMuIiwic3ViIjoiRmxvd0ZvcmdlIEluYy4iLCJuYmYiOjE2OTQ2NDk2MDAsImV4cCI6MzI1MDM2ODAwMDAsIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxNTAsInRlYW1zIjo1MCwicHJvamVjdHMiOjUwLCJkZXZpY2VzIjo1MCwidGllciI6InRlYW1zIiwiZGV2Ijp0cnVlLCJpYXQiOjE2OTQ3MDExNzh9.ENcnQ-_c-sBGmEAQjiLbt5rIBRVCFBeLj2uZYXrGRoJ3JY7XL5r12KCNAW12BiMkTVqvCVnsRIA3lyQz-yteKA' // eslint-disable-line camelcase

    /**
    * Test License with tier: enterprise
    *
    * Details:
    * ```
    * {
    *   "id": "afb0e083-e560-4c07-a919-87dd775bb7a8",
    *   "iss": "FlowForge Inc.",
    *   "sub": "FlowForge Inc.",
    *   "nbf": 1694649600,
    *   "exp": 32503680000,,
    *   "note": "Development-mode Only. Not for production",
    *   "users": 150,
    *   "teams": 50,
    *   "projects": 50,
    *   "devices": 50,
    *   "tier": "enterprise",
    *   "dev": true
    * }
    * ```
    */
    const TEST_LICENSE_ENTERPRISE = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjJmZjAwMjJiLTAwOGMtNDI3OS1hNWU5LTEwOTI2YTNhNWNjMCIsImlzcyI6IkZsb3dGb3JnZSBJbmMuIiwic3ViIjoiRmxvd0ZvcmdlIEluYy4iLCJuYmYiOjE2OTQ2NDk2MDAsImV4cCI6MzI1MDM2ODAwMDAsIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxNTAsInRlYW1zIjo1MCwicHJvamVjdHMiOjUwLCJkZXZpY2VzIjo1MCwidGllciI6ImVudGVycHJpc2UiLCJkZXYiOnRydWUsImlhdCI6MTY5NDcwMTM3Nn0.3Gtyr0axCR2LcBUFAJgDwfIjhLEBbd91rHiGpePHl_oBab9Y6f3osPK6xBtR5ZnRwuSg6XuTp6xc7bQtdONKmA' // eslint-disable-line camelcase

    /**
     * Get the forge application (licensed or unlicensed)
     * @param {String} [license] (optional) The license to use. If null, use the default license
     * @returns the forge application
     */
    async function getApp (license) {
        return await FF_UTIL.setupApp({ housekeeper: false, license })
    }

    describe('unlicensed', function () {
        before(async function () {
            app = await getApp()
        })
        after(async function () {
            await app.close()
        })
        it('Uses default limits when no license applied', async function () {
            app.license.get('users').should.equal(app.license.defaults.users)
            app.license.get('teams').should.equal(app.license.defaults.teams)
            app.license.get('instances').should.equal(app.license.defaults.instances)
        })

        it('Gets all usage count and limits (unlicensed)', async function () {
            const usage = await app.license.usage()
            // check usage contains the correct keys
            usage.should.only.have.keys('users', 'teams', 'instances')
            // check each item has the correct keys
            usage.users.should.only.have.keys('resource', 'count', 'limit')
            usage.teams.should.only.have.keys('resource', 'count', 'limit')
            usage.instances.should.only.have.keys('resource', 'count', 'limit')

            // check usage values are correct
            usage.users.count.should.equal(0)
            usage.users.limit.should.equal(app.license.defaults.users)
            usage.users.resource.should.equal('users')

            usage.teams.count.should.equal(0)
            usage.teams.limit.should.equal(app.license.defaults.teams)
            usage.teams.resource.should.equal('teams')

            usage.instances.count.should.equal(0)
            usage.instances.limit.should.equal(app.license.defaults.instances)
            usage.instances.resource.should.equal('instances')
        })
        it('Gets users usage count and limit only (unlicensed)', async function () {
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
            const usage = await app.license.usage('teams')
            // check usage contains the correct keys
            usage.should.only.have.keys('teams')
            // check item has the correct keys
            usage.teams.should.only.have.keys('resource', 'count', 'limit')
            usage.teams.count.should.equal(0)
            usage.teams.limit.should.equal(app.license.defaults.teams)
            usage.teams.resource.should.equal('teams')
        })
        it('Gets instance usage count and limit only (unlicensed)', async function () {
            const usage = await app.license.usage('instances')
            // check usage contains the correct keys
            usage.should.only.have.keys('instances')
            // check item has the correct keys
            usage.instances.should.only.have.keys('resource', 'count', 'limit')
            usage.instances.count.should.equal(0)
            usage.instances.limit.should.equal(app.license.defaults.instances)
            usage.instances.resource.should.equal('instances')
        })
        it('Gets devices usage count and limit only (unlicensed)', async function () {
            const usage = await app.license.usage('devices')
            // check usage contains the correct keys
            usage.should.only.have.keys('devices')
            // check item has the correct keys
            usage.devices.should.only.have.keys('resource', 'count', 'limit')
            usage.devices.count.should.equal(0)
            usage.devices.limit.should.equal(app.license.defaults.instances)
            usage.devices.resource.should.equal('devices')
        })
    })

    describe('licensed - separate projects/devices claims', function () {
        before(async function () {
            app = await getApp(TEST_LICENSE_4u_5t_6p_7d)
        })
        after(async function () {
            await app.close()
        })
        it('Gets all usage count and limits (licensed)', async function () {
            const usage = await app.license.usage()
            // check usage contains the correct keys
            usage.should.only.have.keys('users', 'teams', 'instances', 'devices')
            // check each item has the correct keys
            usage.users.should.only.have.keys('resource', 'count', 'limit')
            usage.teams.should.only.have.keys('resource', 'count', 'limit')
            usage.instances.should.only.have.keys('resource', 'count', 'limit')
            usage.devices.should.only.have.keys('resource', 'count', 'limit')
            // check usage values are correct
            usage.users.count.should.equal(0)
            usage.users.limit.should.equal(4)
            usage.users.resource.should.equal('users')

            usage.teams.count.should.equal(0)
            usage.teams.limit.should.equal(5)
            usage.teams.resource.should.equal('teams')

            usage.instances.count.should.equal(0)
            usage.instances.limit.should.equal(6)
            usage.instances.resource.should.equal('instances')

            usage.devices.count.should.equal(0)
            usage.devices.limit.should.equal(7)
            usage.devices.resource.should.equal('devices')
        })
        it('Gets users usage count and limit only (licensed)', async function () {
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
            const usage = await app.license.usage('teams')
            // check usage contains the correct keys
            usage.should.only.have.keys('teams')
            // check item has the correct keys
            usage.teams.should.only.have.keys('resource', 'count', 'limit')
            usage.teams.count.should.equal(0)
            usage.teams.limit.should.equal(5)
            usage.teams.resource.should.equal('teams')
        })
        it('Gets instance usage count and limit only (licensed)', async function () {
            const usage = await app.license.usage('instances')
            // check usage contains the correct keys
            usage.should.only.have.keys('instances')
            // check item has the correct keys
            usage.instances.should.only.have.keys('resource', 'count', 'limit')
            usage.instances.count.should.equal(0)
            usage.instances.limit.should.equal(6)
            usage.instances.resource.should.equal('instances')
        })
        it('Gets devices usage count and limit only (licensed)', async function () {
            const usage = await app.license.usage('devices')
            // check usage contains the correct keys
            usage.should.only.have.keys('devices')
            // check item has the correct keys
            usage.devices.should.only.have.keys('resource', 'count', 'limit')
            usage.devices.count.should.equal(0)
            usage.devices.limit.should.equal(7)
            usage.devices.resource.should.equal('devices')
        })

        it('Uses license provided limits', async function () {
            app.license.get('organisation').should.equal('FlowForge Inc.')
            app.license.get('users').should.equal(4)
            app.license.get('teams').should.equal(5)
            app.license.get('projects').should.equal(6)
            app.license.get('devices').should.equal(7)
        })
    })

    describe('licensed - combined instances claims', function () {
        before(async function () {
            app = await getApp(TEST_LICENSE_4u_5t_13i)
        })
        after(async function () {
            await app.close()
        })
        it('Gets all usage count and limits (licensed)', async function () {
            const usage = await app.license.usage()
            // check usage contains the correct keys
            usage.should.only.have.keys('users', 'teams', 'instances')
            // check each item has the correct keys
            usage.users.should.only.have.keys('resource', 'count', 'limit')
            usage.teams.should.only.have.keys('resource', 'count', 'limit')
            usage.instances.should.only.have.keys('resource', 'count', 'limit')
            // check usage values are correct
            usage.users.count.should.equal(0)
            usage.users.limit.should.equal(4)
            usage.users.resource.should.equal('users')

            usage.teams.count.should.equal(0)
            usage.teams.limit.should.equal(5)
            usage.teams.resource.should.equal('teams')

            usage.instances.count.should.equal(0)
            usage.instances.limit.should.equal(13)
            usage.instances.resource.should.equal('instances')
        })
        it('Gets users usage count and limit only (licensed)', async function () {
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
            const usage = await app.license.usage('teams')
            // check usage contains the correct keys
            usage.should.only.have.keys('teams')
            // check item has the correct keys
            usage.teams.should.only.have.keys('resource', 'count', 'limit')
            usage.teams.count.should.equal(0)
            usage.teams.limit.should.equal(5)
            usage.teams.resource.should.equal('teams')
        })
        it('Gets instance usage count and limit only (licensed)', async function () {
            const usage = await app.license.usage('instances')
            // check usage contains the correct keys
            usage.should.only.have.keys('instances')
            // check item has the correct keys
            usage.instances.should.only.have.keys('resource', 'count', 'limit')
            usage.instances.count.should.equal(0)
            usage.instances.limit.should.equal(13)
            usage.instances.resource.should.equal('instances')
        })
        it('Gets devices usage count and limit only (licensed)', async function () {
            // For a combined license, querying the devices usage gives the instances
            // usage and limits.
            const usage = await app.license.usage('devices')
            // check usage contains the correct keys
            usage.should.only.have.keys('devices')
            // check item has the correct keys
            usage.devices.should.only.have.keys('resource', 'count', 'limit')
            usage.devices.count.should.equal(0)
            usage.devices.limit.should.equal(13)
            usage.devices.resource.should.equal('devices')
        })

        it('Uses license provided limits', async function () {
            app.license.get('organisation').should.equal('FlowFuse Development')
            app.license.get('users').should.equal(4)
            app.license.get('teams').should.equal(5)
            app.license.get('instances').should.equal(13)
            should.not.exist(app.license.get('projects'))
            should.not.exist(app.license.get('devices'))
        })
    })

    describe('licensed - 0 claims', function () {
        before(async function () {
            app = await getApp(TEST_LICENSE_0_CLAIMS)
        })
        after(async function () {
            await app.close()
        })
        it('Returns 0 as the limit property when querying usage data for a license without claims', async function () {
            app.license.get('organisation').should.equal('FlowForge Inc.')
            const usage = await app.license.usage()
            usage.should.only.have.keys('users', 'teams', 'instances', 'devices')
            usage.users.limit.should.equal(0)
            usage.teams.limit.should.equal(0)
            usage.instances.limit.should.equal(0)
            usage.devices.limit.should.equal(0)
        })

        it('Returns 0 for any limits if license does not include claim', async function () {
            app.license.get('organisation').should.equal('FlowForge Inc.')
            app.license.get('users').should.equal(0)
            app.license.get('teams').should.equal(0)
            app.license.get('projects').should.equal(0)
            app.license.get('devices').should.equal(0)
        })
    })
    describe('licensed - EE teams', function () {
        before(async function () {
            app = await getApp(TEST_LICENSE_TEAM)
        })
        after(async function () {
            await app.close()
        })
        it('Identifies as Team Tier', async function () {
            app.license.get('tier').should.equal('teams')
        })
    })
    describe('licensed - EE enterprise', function () {
        before(async function () {
            app = await getApp(TEST_LICENSE_ENTERPRISE)
        })
        after(async function () {
            await app.close()
        })
        it('Identifies as Enterprise Tier', async function () {
            app.license.get('tier').should.equal('enterprise')
        })
    })
})
