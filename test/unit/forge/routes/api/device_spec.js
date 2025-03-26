const should = require('should') // eslint-disable-line
const sinon = require('sinon')

const { sha256, compareHash } = require('../../../../../forge/db/utils')
const setup = require('../setup')

const FF_UTIL = require('flowforge-test-utils')
const { Roles } = FF_UTIL.require('forge/lib/roles')
const dbUtils = FF_UTIL.require('forge/db/utils')
/** @type {import("mocha").describe} */
describe('Device API', async function () {
    let app
    /** @type {import('../../../../../forge/db/controllers/AccessToken') */
    let AccessTokenController
    /** @type {import('../../../../lib/TestModelFactory')} */
    let factory
    let projectInstanceCount = 0
    const generateProjectName = () => 'test-project' + (projectInstanceCount++)

    const TestObjects = {}

    /**
     * Create a device
     * @param {Object} options - Options for creating a device
     * @returns {Promise<Object>} - The device object
     */
    async function createDevice (options) {
        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/devices',
            body: {
                name: options.name,
                type: options.type,
                team: options.team
            },
            cookies: { sid: options.as }
        })
        let device = response.json()

        if (options.agentVersion) {
            // get the db device and apply an agentVersion of 1.11.0 to permit "Add to Application" feature
            // ordinarily, the `agentVersion` is set by the device when it first connects. In tests we don't
            // have an actual device and must set it manually inorder for the API to permit the "Add to Application"
            const dbDevice = await app.db.models.Device.byId(device.id)
            await dbDevice.update({ agentVersion: options.agentVersion })
            await dbDevice.save()
        }

        if (options.application) {
            const response2 = await app.inject({
                method: 'PUT',
                url: `/api/v1/devices/${device.id}`,
                body: {
                    application: options.application
                },
                cookies: { sid: TestObjects.tokens.bob }
            })
            device = response2.json()
        } else if (options.instance) {
            const response2 = await app.inject({
                method: 'PUT',
                url: `/api/v1/devices/${device.id}`,
                body: {
                    instance: options.instance
                },
                cookies: { sid: TestObjects.tokens.bob }
            })
            device = response2.json()
        }
        return device
    }

    async function setupApp (license) {
        const setupConfig = {
            limits: {
                instances: 50
            }
        }
        if (license) {
            setupConfig.license = license
        }
        app = await setup(setupConfig)
        AccessTokenController = app.db.controllers.AccessToken
        factory = app.factory
        // alice : admin
        // bob
        // chris

        // ATeam ( alice  (owner), bob (owner), chris)
        // BTeam ( bob (owner), chris)
        // CTeam ( chris (owner) )

        // Alice create in setup()
        TestObjects.alice = await app.db.models.User.byUsername('alice')
        TestObjects.bob = await app.db.models.User.create({ username: 'bob', name: 'Bob Solo', email: 'bob@example.com', email_verified: true, password: 'bbPassword' })
        TestObjects.chris = await app.db.models.User.create({ username: 'chris', name: 'Chris Kenobi', email: 'chris@example.com', email_verified: true, password: 'ccPassword' })

        // ATeam create in setup()
        TestObjects.ATeam = await app.db.models.Team.byName('ATeam')
        TestObjects.BTeam = await app.db.models.Team.create({ name: 'BTeam', TeamTypeId: app.defaultTeamType.id })
        TestObjects.CTeam = await app.db.models.Team.create({ name: 'CTeam', TeamTypeId: app.defaultTeamType.id })

        // Alice set as ATeam owner in setup()
        await TestObjects.ATeam.addUser(TestObjects.bob, { through: { role: Roles.Owner } })
        await TestObjects.ATeam.addUser(TestObjects.chris, { through: { role: Roles.Member } })
        await TestObjects.BTeam.addUser(TestObjects.bob, { through: { role: Roles.Owner } })
        await TestObjects.BTeam.addUser(TestObjects.chris, { through: { role: Roles.Member } })
        await TestObjects.CTeam.addUser(TestObjects.chris, { through: { role: Roles.Owner } })

        TestObjects.Project1 = app.project
        TestObjects.provisioningTokens = {
            token1: await AccessTokenController.createTokenForTeamDeviceProvisioning('Provisioning Token 1', TestObjects.ATeam),
            token2: await AccessTokenController.createTokenForTeamDeviceProvisioning('Provisioning Token 2', TestObjects.ATeam, TestObjects.Project1)
        }

        TestObjects.defaultTeamType = app.defaultTeamType
        TestObjects.Application1 = app.application
        TestObjects.tokens = {}
        await login('alice', 'aaPassword')
        await login('bob', 'bbPassword')
        await login('chris', 'ccPassword')
    }

    before(async function () {
        await setupApp()
    })
    after(async function () {
        await app.close()
    })
    afterEach(async function () {
        await app.db.models.Device.destroy({ where: {} })
        await app.db.models.AccessToken.destroy({ where: { scope: 'device' } })
    })

    async function login (username, password) {
        const response = await app.inject({
            method: 'POST',
            url: '/account/login',
            payload: { username, password, remember: false }
        })
        response.cookies.should.have.length(1)
        response.cookies[0].should.have.property('name', 'sid')
        TestObjects.tokens[username] = response.cookies[0].value
    }

    async function createSnapshot (projectId, name, token) {
        return await app.inject({
            method: 'POST',
            url: `/api/v1/projects/${projectId}/snapshots`,
            payload: {
                name
            },
            cookies: { sid: token }
        })
    }
    async function getLiveSettings (device) {
        const response = await app.inject({
            method: 'GET',
            url: `/api/v1/devices/${device.id}/live/settings`,
            headers: {
                authorization: `Bearer ${device.credentials.token}`
            }
        })
        response.statusCode.should.equal(200)
        return response.json()
    }
    async function getSettings (device, token) {
        const response = await app.inject({
            method: 'GET',
            url: `/api/v1/devices/${device.id}/settings`,
            cookies: { sid: token }
        })
        response.statusCode.should.equal(200)
        return response.json()
    }

    async function updateSettings (device, token, settings) {
        const response = await app.inject({
            method: 'PUT',
            url: `/api/v1/devices/${device.id}/settings`,
            body: settings,
            cookies: { sid: token }
        })
        response.statusCode.should.equal(200)
        response.json().should.have.property('status', 'okay')
    }

    describe('Create device', async function () {
        // POST /api/v1/devices
        // - Admin/Owner
        it('rejects if team not included in request', async function () {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/devices',
                body: {
                    name: 'my device',
                    type: 'test device'
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(400)
            // This is *temporary* until we standardise how schema validation errors
            // are returned
            response.body.should.match(/FST_ERR_VALIDATION/)
        })
        it('rejects if user not the team owner', async function () {
            // Chris (member) cannot create device in BTeam
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/devices',
                body: {
                    name: 'my device',
                    type: 'test device',
                    team: TestObjects.BTeam.hashid
                },
                cookies: { sid: TestObjects.tokens.chris }
            })
            response.statusCode.should.equal(403)
        })

        it('rejects if user not in the team', async function () {
            // Bob (non-member) cannot create device in CTeam
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/devices',
                body: {
                    name: 'my device',
                    type: 'test device',
                    team: TestObjects.CTeam.hashid
                },
                cookies: { sid: TestObjects.tokens.bob }
            })
            response.statusCode.should.equal(403)
        })

        it('creates a device in the team', async function () {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/devices',
                body: {
                    name: 'my device',
                    type: 'test device',
                    team: TestObjects.ATeam.hashid
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            const result = response.json()
            result.should.have.property('id')
            result.should.have.property('name', 'my device')
            result.should.have.property('type', 'test device')
            result.should.have.property('links').and.be.an.Object()
            result.should.have.property('team').and.be.an.Object()
            result.should.not.have.property('instance')
            result.should.have.property('credentials').and.be.an.Object()

            result.team.should.have.property('id', TestObjects.ATeam.hashid)
            result.credentials.should.have.property('token')
        })

        it('creates a device in the team using a provisioning token', async function () {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/devices',
                body: {
                    name: '00:11:22:33:44:55',
                    type: 'test device',
                    team: TestObjects.ATeam.hashid
                },
                headers: {
                    authorization: `Bearer ${TestObjects.provisioningTokens.token1.token}`
                }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.property('name', '00:11:22:33:44:55')
            result.should.have.property('type', 'test device')
            result.should.have.property('links').and.be.an.Object()
            result.should.have.property('team').and.be.an.Object()
            result.should.not.have.property('instance')
            result.should.have.property('credentials').and.be.an.Object()

            result.team.should.have.property('id', TestObjects.ATeam.hashid)
            result.credentials.should.have.property('token')
        })

        it('creates a device in the team and assigns it to a project using a provisioning token', async function () {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/devices',
                body: {
                    name: '00:11:22:33:44:55',
                    type: 'test device',
                    team: TestObjects.ATeam.hashid
                },
                headers: {
                    authorization: `Bearer ${TestObjects.provisioningTokens.token2.token}`
                }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.property('name', '00:11:22:33:44:55')
            result.should.have.property('type', 'test device')
            result.should.have.property('lastSeenMs', null) // required for device list UI
            result.should.have.property('links').and.be.an.Object()
            result.should.have.property('team').and.be.an.Object()
            result.should.have.property('instance').and.be.an.Object()
            result.should.have.property('credentials').and.be.an.Object()

            result.team.should.have.property('id', TestObjects.ATeam.hashid)
            result.instance.should.have.property('id', TestObjects.Project1.id)
            result.credentials.should.have.property('token')
        })

        it('should not provision a device for a different team', async function () {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/devices',
                body: {
                    name: '00:11:22:33:44:55',
                    type: 'test device',
                    team: TestObjects.BTeam.hashid
                },
                headers: {
                    authorization: `Bearer ${TestObjects.provisioningTokens.token1.token}`
                }
            })
            response.statusCode.should.equal(401)
            const result = response.json()
            result.should.have.property('error', 'unauthorized')
            result.should.have.property('code', 'unauthorized')
        })

        it('should not create a device if the provisioning token is invalid', async function () {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/devices',
                body: {
                    name: '00:11:22:33:44:55',
                    type: 'test device',
                    team: TestObjects.ATeam.hashid
                },
                headers: {
                    authorization: 'Bearer token_does_not_exist'
                }
            })
            response.statusCode.should.equal(401)
            const result = response.json()
            result.should.have.property('error', 'unauthorized')
            result.should.have.property('code', 'unauthorized')
        })

        describe('limits', function () {
            beforeEach(async function () {
                // Close down the default app
                await app.close()
                await setupApp()
            })
            after(async function () {
                // Once all done, create the clean app for later tests
                await app.close()
                await setupApp()
            })
            it('limits how many devices can be added to a team according to TeamType', async function () {
                // Set TeamType deviceLimit = 2
                const existingTeamTypeProps = TestObjects.defaultTeamType.properties
                existingTeamTypeProps.devices = { limit: 2 }
                TestObjects.defaultTeamType.properties = existingTeamTypeProps
                await TestObjects.defaultTeamType.save()

                ;(await TestObjects.ATeam.deviceCount()).should.equal(0)
                for (let i = 0; i < 2; i++) {
                    const response = await createDevice({ name: `D${i + 1}`, type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
                    response.should.have.property('id')
                }
                ;(await TestObjects.ATeam.deviceCount()).should.equal(2)

                const response = await createDevice({ name: 'D3', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
                response.should.have.property('error')
                response.error.should.match(/limit reached/)
            })

            it('Does not limit how many devices can be created when licensed', async function () {
                // Limited to 2 devices
                await app.license.apply('eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGb3JnZSBJbmMuIERldmVsb3BtZW50IiwibmJmIjoxNjYyNTk1MjAwLCJleHAiOjc5ODcwNzUxOTksIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxNTAsInRlYW1zIjo1MCwicHJvamVjdHMiOjUwLCJkZXZpY2VzIjoyLCJkZXYiOnRydWUsImlhdCI6MTY2MjY1MzkyMX0.Tj4fnuDuxi_o5JYltmVi1Xj-BRn0aEjwRPa_fL2MYa9MzSwnvJEd-8bsRM38BQpChjLt-wN-2J21U7oSq2Fp5A')
                // Check we're at the starting point we expect
                ;(await app.db.models.Device.count()).should.equal(0)

                for (let i = 0; i < 3; i++) {
                    const response = await createDevice({ name: `D${i + 1}`, type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
                    response.should.not.have.property('error')
                    response.should.have.property('id')
                }
                ;(await app.db.models.Device.count()).should.equal(3)
            })
            it('Limits how many devices can be created when unlicensed', async function () {
                // Limited to 2 devices
                app.license.defaults.instances = 3
                // Check we're at the starting point we expect - combined device+instance count = 1
                ;(await app.license.usage()).instances.count.should.equal(1)

                for (let i = 0; i < 2; i++) {
                    const response = await createDevice({ name: `D${i + 1}`, type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
                    response.should.have.property('id')
                }

                ;(await app.db.models.Device.count()).should.equal(2)

                const response = await createDevice({ name: 'D3', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
                response.should.have.property('error')
                response.error.should.match(/license limit/)
            })
        })
    })

    describe('Generate Device credentials', function () {
        it('regenerates a devices credentials', async function () {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/devices',
                body: {
                    name: 'my device',
                    type: 'test device',
                    team: TestObjects.ATeam.hashid
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            const device = response.json()

            // check that the OTC is a string, length of 8 or more & made up of xx-xx-xx where xx is 2 or more characters
            device.credentials.should.have.property('otc').and.be.a.String()
            device.credentials.otc.length.should.be.greaterThanOrEqual(8)
            device.credentials.otc.should.match(/^\w{2,}-\w{2,}-\w{2,}$/)

            device.credentials.should.have.property('token')
            device.credentials.should.have.property('credentialSecret')
            device.credentials.should.have.property('broker')
            device.credentials.broker.should.have.property('url', ':test:')
            device.credentials.broker.should.have.property('username')
            device.credentials.broker.should.have.property('password')

            const response2 = await app.inject({
                method: 'POST',
                url: `/api/v1/devices/${device.id}/generate_credentials`,
                cookies: { sid: TestObjects.tokens.alice }
            })

            response2.statusCode.should.equal(200)
            const newCreds = response2.json()

            // check that the OTC is a string, length of 8 or more & made up of xx-xx-xx where xx is 2 or more characters
            newCreds.should.have.property('otc').and.be.a.String()
            newCreds.otc.length.should.be.greaterThanOrEqual(8)
            newCreds.otc.should.match(/^\w{2,}-\w{2,}-\w{2,}$/)

            newCreds.should.have.property('token')
            newCreds.should.have.property('credentialSecret')
            newCreds.should.have.property('broker')
            newCreds.broker.should.have.property('url', ':test:')
            newCreds.broker.should.have.property('username')
            newCreds.broker.should.have.property('password')

            newCreds.otc.should.not.equal(device.credentials.otc) // OTC should be different
            newCreds.token.should.not.equal(device.credentials.token) // token should be different
            newCreds.credentialSecret.should.not.equal(device.credentials.credentialSecret)
            newCreds.broker.url.should.equal(device.credentials.broker.url)
            newCreds.broker.username.should.equal(device.credentials.broker.username)
            newCreds.broker.password.should.not.equal(device.credentials.broker.password)
        })
        it('regenerates a devices credentials when a device quick connects', async function () {
            // create an app device, generate one-time-code for quick connect
            const device1 = await factory.createDevice({ name: 'device1' }, TestObjects.ATeam, null, TestObjects.Application1)
            const dbDevice = await app.db.models.Device.byId(device1.hashid)
            const initialCredentials = await dbDevice.refreshAuthTokens({ refreshOTC: true })
            const otcToken = Buffer.from(initialCredentials.otc).toString('base64')
            const otcTokenClause = { where: { token: sha256(otcToken) } }
            const accessTokenBefore = await app.db.models.AccessToken.findOne(otcTokenClause)
            should.exist(accessTokenBefore)

            // quick connect the device using the one-time-code
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/devices',
                body: {
                    setup: true
                },
                headers: {
                    Authorization: `Bearer ${otcToken}` // using the one-time-code as the session token
                }
            })
            response.statusCode.should.equal(200)

            // check the OTC is not refreshed and is not returned in the response
            const result = response.json()
            result.should.have.property('credentials').and.be.an.Object()
            const newCreds = result.credentials
            newCreds.should.not.have.property('otc')
            newCreds.credentialSecret.should.not.equal(initialCredentials.credentialSecret)
            newCreds.broker.url.should.equal(initialCredentials.broker.url)
            newCreds.broker.username.should.equal(initialCredentials.broker.username)
            newCreds.broker.password.should.not.equal(initialCredentials.broker.password)

            // ensure the otc was deleted from the db (used / spent)
            const accessTokenAfter = await app.db.models.AccessToken.findOne(otcTokenClause)
            should.not.exist(accessTokenAfter)
        })
        it('returns 404 for invalid OTC', async function () {
            // create an app device, generate one-time-code for quick connect
            const device1 = await factory.createDevice({ name: 'device1' }, TestObjects.ATeam, null, TestObjects.Application1)
            const dbDevice = await app.db.models.Device.byId(device1.hashid)
            const initialCredentials = await dbDevice.refreshAuthTokens({ refreshOTC: true })
            const otc = initialCredentials.otc
            // attempt to quick connect the device using a bad one-time-code
            const badOtcToken = Buffer.from(otc + 'bad').toString('base64')
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/devices',
                body: {
                    setup: true
                },
                headers: {
                    Authorization: `Bearer ${badOtcToken}`
                }
            })

            response.statusCode.should.equal(401)

            // ensure token is not spent
            const otcToken = Buffer.from(otc).toString('base64')
            const otcTokenClause = { where: { token: sha256(otcToken) } }
            const accessTokenBefore = await app.db.models.AccessToken.findOne(otcTokenClause)
            should.exist(accessTokenBefore)
        })
    })

    describe('Get device details', async function () {
        it('non-team member cannot get device details', async function () {
            const CTeamDevice = await app.db.models.Device.create({ name: 'deviceOne', type: 'something', credentialSecret: 'deviceKey' })
            await CTeamDevice.setTeam(TestObjects.CTeam)

            // bob should not have access to CTeamDevice
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/devices/${CTeamDevice.hashid}`,
                cookies: { sid: TestObjects.tokens.bob }
            })
            response.statusCode.should.equal(403)
        })
        it('provides device details including project and team', async function () {
            TestObjects.deviceOne = await app.db.models.Device.create({ name: 'deviceOne', type: 'something', credentialSecret: 'deviceKey' })
            TestObjects.deviceProject = await app.db.models.Project.create({ name: generateProjectName(), type: '', url: '' })
            await TestObjects.deviceOne.setTeam(TestObjects.ATeam)
            await TestObjects.deviceOne.setProject(TestObjects.deviceProject)

            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/devices/${TestObjects.deviceOne.hashid}`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            const result = response.json()
            result.should.have.property('id', TestObjects.deviceOne.hashid)
            result.should.have.property('name', 'deviceOne')
            result.should.have.property('type', 'something')
            result.should.have.property('links')
            result.should.have.property('team')
            result.should.not.have.property('accessToken')

            result.team.should.have.property('id', TestObjects.ATeam.hashid)
            result.should.have.property('instance')
            result.instance.should.have.property('id', TestObjects.deviceProject.id)
        })

        it('provides device details - unassigned project', async function () {
            TestObjects.deviceOne = await app.db.models.Device.create({ name: 'deviceOne', type: 'something', credentialSecret: 'deviceKey' })
            TestObjects.deviceProject = await app.db.models.Project.create({ name: generateProjectName(), type: '', url: '' })
            await TestObjects.deviceOne.setTeam(TestObjects.ATeam)

            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/devices/${TestObjects.deviceOne.hashid}`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            const result = response.json()
            result.should.have.property('id', TestObjects.deviceOne.hashid)
            result.should.have.property('name', 'deviceOne')
            result.should.have.property('type', 'something')
            result.should.have.property('links')
            result.should.have.property('team')
            result.should.have.property('lastSeenMs', null) // required for device list UI
            result.should.have.property('targetSnapshot')
            result.should.have.property('activeSnapshot')
            result.team.should.have.property('id', TestObjects.ATeam.hashid)
            result.should.not.have.property('instance')
            result.should.not.have.property('application')
        })

        // GET /api/v1/devices/:deviceId
        // - Must be admin or team owner/member
    })

    describe('Edit device details', async function () {
        // PUT /api/v1/devices/:deviceId
        // - Admin/Owner

        it('basic properties can be edited', async function () {
            const device = await createDevice({ name: 'Ad1', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/devices/${device.id}`,
                body: {
                    name: 'newName',
                    type: 'newType'
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)
            const result = response.json()

            result.should.have.property('name', 'newName')
            result.should.have.property('type', 'newType')
        })

        it('non-team owner cannot edit properties', async function () {
            // Chris (member, not owner) cannot modify device properties
            const device = await createDevice({ name: 'Ad1', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/devices/${device.id}`,
                body: {
                    name: 'newName',
                    type: 'newType'
                },
                cookies: { sid: TestObjects.tokens.chris }
            })
            response.statusCode.should.equal(403)
        })
        describe('assign to application', function () {
            it('can assign to an application - default starter snapshot', async function () {
                const agentVersion = '1.11.0' // min agent version required for application assignment
                const device = await createDevice({ name: 'Ad1a', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice, agentVersion })
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/devices/${device.id}`,
                    body: {
                        application: TestObjects.Application1.hashid
                    },
                    cookies: { sid: TestObjects.tokens.bob }
                })
                const result = response.json()
                result.should.have.property('ownerType', 'application')
                result.should.have.property('application').and.be.an.Object()
                result.application.should.have.property('id', TestObjects.Application1.hashid)
            })
            it('agent < v1.11.2 is instructed to use Node-RED@3.0.2', async function () {
                const agentVersion = '1.11.0' // min agent version required for application assignment
                const device = await createDevice({ name: 'Ad1a', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice, agentVersion })
                // assign the new device to application
                await app.inject({
                    method: 'PUT',
                    url: `/api/v1/devices/${device.id}`,
                    body: {
                        application: TestObjects.Application1.hashid
                    },
                    cookies: { sid: TestObjects.tokens.bob }
                })
                // get the snapshot for this device
                const response = await app.inject({
                    method: 'GET',
                    url: `/api/v1/devices/${device.id}/live/snapshot`,
                    headers: {
                        authorization: `Bearer ${device.credentials.token}`
                    }
                })
                const result = response.json()
                result.should.have.property('id')
                result.should.have.property('name', 'Starter Snapshot')
                result.should.have.property('modules').and.be.an.Object()
                result.modules.should.have.property('node-red', '3.0.2')
            })
            it('agent >= v1.11.2 is instructed to use Node-RED@latest', async function () {
                const agentVersion = '1.11.2' // min agent version required for NR 3.1 (as this agent handles ESM issue)
                const device = await createDevice({ name: 'Ad1a', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice, agentVersion })
                // assign the new device to application
                await app.inject({
                    method: 'PUT',
                    url: `/api/v1/devices/${device.id}`,
                    body: {
                        application: TestObjects.Application1.hashid
                    },
                    cookies: { sid: TestObjects.tokens.bob }
                })
                // get the snapshot for this device
                const response = await app.inject({
                    method: 'GET',
                    url: `/api/v1/devices/${device.id}/live/snapshot`,
                    headers: {
                        authorization: `Bearer ${device.credentials.token}`
                    }
                })
                const result = response.json()
                result.should.have.property('id')
                result.should.have.property('name', 'Starter Snapshot')
                result.should.have.property('modules').and.be.an.Object()
                result.modules.should.have.property('node-red', 'latest')
            })
            it('snapshot uploaded without node-red dependency is always delivered to a device with the node-red:version', async function () {
                const agentVersion = '1.11.2' // min agent version required for NR 3.1 (as this agent handles ESM issue)
                const device = await createDevice({ name: 'Ad1a', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice, agentVersion })
                // assign the new device to application
                await app.inject({
                    method: 'PUT',
                    url: `/api/v1/devices/${device.id}`,
                    body: {
                        application: TestObjects.Application1.hashid
                    },
                    cookies: { sid: TestObjects.tokens.bob }
                })

                // upload a basic snapshot for this device
                const simpleSnapshot = {
                    name: 'uploaded snapshot',
                    description: '',
                    credentialSecret: '',
                    settings: {
                        settings: {},
                        env: {},
                        modules: {}
                    },
                    flows: {
                        flows: [],
                        credentials: null
                    },
                    DeviceId: device.id,
                    UserId: TestObjects.bob.id
                }
                const dbDevice = await app.db.models.Device.byId(device.id)
                // uploadSnapshot (app, owner, snapshot, credentialSecret, user)
                const snapshot = await app.db.controllers.Snapshot.uploadSnapshot(dbDevice, simpleSnapshot, '', TestObjects.bob)

                // set this snapshot as the target snapshot for the device
                await app.inject({
                    method: 'PUT',
                    url: `/api/v1/devices/${device.id}`,
                    body: {
                        targetSnapshot: snapshot.hashid
                    },
                    cookies: { sid: TestObjects.tokens.bob }
                })
                const response = await app.inject({
                    method: 'GET',
                    url: `/api/v1/devices/${device.id}/live/snapshot`,
                    headers: {
                        authorization: `Bearer ${device.credentials.token}`
                    }
                })
                const result = response.json()
                result.should.have.property('id')
                result.should.have.property('name', 'uploaded snapshot')
                result.should.have.property('modules').and.be.an.Object()
                result.modules.should.have.property('node-red', 'latest')
            })
            it('device updated to use target snapshot of an instance returns correct env vars', async function () {
                // It is possible to "view all application snapshots" and pick one to assign to a device
                // This test ensures that the device receives the correct environment variables
                const agentVersion = '1.11.2' // min agent version required for NR 3.1 (as this agent handles ESM issue)
                const device = await createDevice({ name: 'instance-snapshot-set-to-device', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice, agentVersion })

                // assign the new device to application
                await app.inject({
                    method: 'PUT',
                    url: `/api/v1/devices/${device.id}`,
                    body: {
                        application: TestObjects.Application1.hashid
                    },
                    cookies: { sid: TestObjects.tokens.bob }
                })

                // upload a basic instance snapshot against instance
                const instanceSnapshot = {
                    name: `instance ${TestObjects.Project1.id} snapshot uploaded @ ${Date.now()}`,
                    description: '',
                    credentialSecret: '',
                    flows: {
                        flows: [],
                        credentials: null
                    },
                    InstanceId: TestObjects.Project1.id,
                    UserId: TestObjects.bob.id,
                    settings: {
                        settings: {},
                        env: {
                            FF_INSTANCE_ID: TestObjects.Project1.id,
                            FF_INSTANCE_NAME: TestObjects.Project1.name,
                            FF_PROJECT_ID: TestObjects.Project1.id,
                            FF_PROJECT_NAME: TestObjects.Project1.name,
                            RANDOM_ENV_VAR: 'random value'
                        },
                        modules: {
                            'node-red': '3.1.3'
                        }
                    }
                }

                // now assign this snapshot to the device
                const uploadedSnapshot = await app.db.controllers.Snapshot.uploadSnapshot(TestObjects.Project1, instanceSnapshot, '', TestObjects.bob, { components: { credentials: false } })
                const snapshot = await app.db.models.ProjectSnapshot.byId(uploadedSnapshot.id)

                // set this snapshot as the target snapshot for the device
                await app.inject({
                    method: 'PUT',
                    url: `/api/v1/devices/${device.id}`,
                    body: {
                        targetSnapshot: snapshot.hashid
                    },
                    cookies: { sid: TestObjects.tokens.bob }
                })
                const response = await app.inject({
                    method: 'GET',
                    url: `/api/v1/devices/${device.id}/live/snapshot`,
                    headers: {
                        authorization: `Bearer ${device.credentials.token}`
                    }
                })
                const result = response.json()
                result.should.have.property('env').and.be.an.Object()
                result.env.should.not.have.property('FF_INSTANCE_ID')
                result.env.should.not.have.property('FF_INSTANCE_NAME')
                result.env.should.not.have.property('FF_PROJECT_ID')
                result.env.should.not.have.property('FF_PROJECT_NAME')

                result.env.should.have.property('FF_APPLICATION_ID', TestObjects.Application1.hashid)
                result.env.should.have.property('FF_APPLICATION_NAME', TestObjects.Application1.name)
                result.env.should.have.property('FF_DEVICE_ID', device.id)
                result.env.should.have.property('FF_DEVICE_NAME', device.name)
                result.env.should.have.property('FF_SNAPSHOT_ID', snapshot.hashid)
                result.env.should.have.property('FF_SNAPSHOT_NAME', snapshot.name)
                result.env.should.have.property('RANDOM_ENV_VAR', 'random value')
            })
            it('`@flowfuse/nr-project-nodes` dependency is included in the starter snapshot', async function () {
                const agentVersion = '1.11.0' // min agent version required for application assignment
                const device = await createDevice({ name: 'Ad1a-dep-test', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice, agentVersion })
                // assign the new device to application
                await app.inject({
                    method: 'PUT',
                    url: `/api/v1/devices/${device.id}`,
                    body: {
                        application: TestObjects.Application1.hashid
                    },
                    cookies: { sid: TestObjects.tokens.bob }
                })
                // get the snapshot for this device
                const response = await app.inject({
                    method: 'GET',
                    url: `/api/v1/devices/${device.id}/live/snapshot`,
                    headers: {
                        authorization: `Bearer ${device.credentials.token}`
                    }
                })
                const result = response.json()
                result.should.have.property('id')
                result.should.have.property('name', 'Starter Snapshot')
                result.should.have.property('modules').and.be.an.Object()
                result.modules.should.have.property('@flowfuse/nr-project-nodes', '>0.5.0')
                // // ensure old flowforge module is not present
                // result.modules.should.not.have.property('@flowforge/nr-project-nodes')
            })
            it('old `@flowforge/nr-project-nodes` dependency is replaced with @flowfuse dependency in an existing snapshot', async function () {
                const agentVersion = '1.11.0' // min agent version required for application assignment
                const device = await createDevice({ name: 'Ad1a-dep-test2', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice, agentVersion })
                // assign the new device to application
                await app.inject({
                    method: 'PUT',
                    url: `/api/v1/devices/${device.id}`,
                    body: {
                        application: TestObjects.Application1.hashid
                    },
                    cookies: { sid: TestObjects.tokens.bob }
                })
                // get the db model of the device
                const dbDevice = await app.db.models.Device.byId(device.id)
                // create a snapshot for this device with the old flowforge nr-project-nodes module
                // by entering it straight into the database
                const snapshot = await app.db.models.ProjectSnapshot.create({
                    name: 'app-device-snap-test-' + Date.now(),
                    description: 'App Device Snapshot Description',
                    flows: {},
                    settings: {
                        settings: {},
                        env: {},
                        modules: {
                            'node-red': '1.2.3',
                            '@flowforge/nr-project-nodes': '0.5.0'
                        }
                    },
                    DeviceId: dbDevice.id,
                    UserId: TestObjects.bob.id
                })
                snapshot.save()

                // set this snapshot as the target snapshot for the device
                await app.inject({
                    method: 'PUT',
                    url: `/api/v1/devices/${device.id}`,
                    body: {
                        targetSnapshot: snapshot.hashid
                    },
                    cookies: { sid: TestObjects.tokens.bob }
                })

                // get the snapshot for this device
                const response = await app.inject({
                    method: 'GET',
                    url: `/api/v1/devices/${device.id}/live/snapshot`,
                    headers: {
                        authorization: `Bearer ${device.credentials.token}`
                    }
                })

                const result = response.json()
                result.should.have.property('modules').and.be.an.Object()
                result.modules.should.have.property('@flowfuse/nr-project-nodes', '>0.5.0')
                // ensure old flowforge module is not present
                result.modules.should.not.have.property('@flowforge/nr-project-nodes')
            })
            it('`@flowfuse/nr-assistant` dependency is included in the starter snapshot', async function () {
                const agentVersion = '1.11.0' // min agent version required for application assignment
                const device = await createDevice({ name: 'Ad1a-dep-test2', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice, agentVersion })
                // assign the new device to application
                await app.inject({
                    method: 'PUT',
                    url: `/api/v1/devices/${device.id}`,
                    body: {
                        application: TestObjects.Application1.hashid
                    },
                    cookies: { sid: TestObjects.tokens.bob }
                })
                // get the snapshot for this device
                const response = await app.inject({
                    method: 'GET',
                    url: `/api/v1/devices/${device.id}/live/snapshot`,
                    headers: {
                        authorization: `Bearer ${device.credentials.token}`
                    }
                })
                const result = response.json()
                result.should.have.property('id')
                result.should.have.property('name', 'Starter Snapshot')
                result.should.have.property('modules').and.be.an.Object()
                result.modules.should.have.property('@flowfuse/nr-assistant', '>=0.1.0')
                // // ensure old flowforge module is not present
                // result.modules.should.not.have.property('@flowforge/nr-project-nodes')
            })
            it('can assign to an application even if device agent version is not present', async function () {
                // Prior to FF 2.0, we would reject application assignment if the agent version was not present
                // Now, we permit it, but the device will be sent null snapshot when it checks in (unless agent version is updated)
                const device = await createDevice({ name: 'Ad1b', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/devices/${device.id}`,
                    body: {
                        application: TestObjects.Application1.hashid
                    },
                    cookies: { sid: TestObjects.tokens.bob }
                })
                response.statusCode.should.equal(200)
            })
            it('can assign to an application if device agent version even is too old to support application assignment', async function () {
                // Prior to FF 2.0, we would reject application assignment if the agent version was too old
                // Now, we permit it, but the old device will be sent null snapshot when it checks in
                const agentVersion = '1.10.1' // agent version too old for application assignment
                const device = await createDevice({ name: 'Ad1c', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice, agentVersion })
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/devices/${device.id}`,
                    body: {
                        application: TestObjects.Application1.hashid
                    },
                    cookies: { sid: TestObjects.tokens.bob }
                })
                response.statusCode.should.equal(200)
            })
            it('can unassign from an application', async function () {
                // first, create a device and add it to application
                const agentVersion = '1.11.0' // min agent version required for application assignment
                const device = await createDevice({ name: 'Ad1d', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice, agentVersion })
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/devices/${device.id}`,
                    body: {
                        application: TestObjects.Application1.hashid
                    },
                    cookies: { sid: TestObjects.tokens.bob }
                })
                const result = response.json()
                result.should.have.property('ownerType', 'application')
                result.should.have.property('application').and.be.an.Object()
                result.application.should.have.property('id', TestObjects.Application1.hashid)

                // next, unassign from application
                const response2 = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/devices/${device.id}`,
                    body: {
                        application: null
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })
                const result2 = response2.json()
                result2.should.have.property('ownerType').and.not.equal('application')
                result2.should.not.have.property('application')
            })
        })
        describe('assign to project', function () {
            async function setupProjectWithSnapshot (setActive) {
                TestObjects.deviceProject = await app.db.models.Project.create({ name: generateProjectName(), type: '', url: '' })
                TestObjects.deviceProject.setTeam(TestObjects.ATeam)
                // Create a snapshot
                TestObjects.deviceProjectSnapshot = (await createSnapshot(TestObjects.deviceProject.id, 'test-snapshot', TestObjects.tokens.alice)).json()
                if (setActive) {
                    // Set snapshot as active
                    await app.inject({
                        method: 'POST',
                        url: `/api/v1/projects/${TestObjects.deviceProject.id}/devices/settings`,
                        body: {
                            targetSnapshot: TestObjects.deviceProjectSnapshot.id
                        },
                        cookies: { sid: TestObjects.tokens.alice }
                    })
                }
            }

            it('can assign to a project - no active snapshot', async function () {
                // Create a project
                await setupProjectWithSnapshot(false)

                const device = await createDevice({ name: 'Ad1', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/devices/${device.id}`,
                    body: {
                        instance: TestObjects.deviceProject.id
                    },
                    cookies: { sid: TestObjects.tokens.bob }
                })
                const result = response.json()
                result.should.have.property('ownerType', 'instance')
                result.should.have.property('instance')
                result.should.not.have.property('application')
                result.should.have.property('targetSnapshot', null)
                result.instance.should.have.property('id', TestObjects.deviceProject.id)
            })
            it('can assign to a project - with active snapshot', async function () {
                // Create a project
                await setupProjectWithSnapshot(true)

                const device = await createDevice({ name: 'Ad1', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/devices/${device.id}`,
                    body: {
                        instance: TestObjects.deviceProject.id
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })
                const result = response.json()
                result.should.have.property('instance')
                result.should.have.property('targetSnapshot')
                result.targetSnapshot.should.have.property('id', TestObjects.deviceProjectSnapshot.id)
                result.instance.should.have.property('id', TestObjects.deviceProject.id)
            })
            it('can unassign from a project', async function () {
                await setupProjectWithSnapshot(true)

                const device = await createDevice({ name: 'Ad1', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/devices/${device.id}`,
                    body: {
                        instance: TestObjects.deviceProject.id
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })
                const result = response.json()
                result.should.have.property('instance')
                result.instance.should.have.property('id', TestObjects.deviceProject.id)
                result.should.have.property('targetSnapshot')
                result.targetSnapshot.should.have.property('id', TestObjects.deviceProjectSnapshot.id)

                const response2 = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/devices/${device.id}`,
                    body: {
                        instance: null
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })
                const result2 = response2.json()
                result2.should.not.have.property('instance')
                // Check the targetSnapshot has been cleared
                result2.should.have.property('targetSnapshot', null)
            })
            it('non-owner cannot assign to a project', async function () {
                // Chris (member) cannot assign to project
                TestObjects.deviceProject = await app.db.models.Project.create({ name: generateProjectName(), type: '', url: '' })
                TestObjects.deviceProject.setTeam(TestObjects.ATeam)

                const device = await createDevice({ name: 'Ad1', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/devices/${device.id}`,
                    body: {
                        instance: TestObjects.deviceProject.id
                    },
                    cookies: { sid: TestObjects.tokens.chris }
                })
                response.statusCode.should.equal(403)
            })
            it('cannot assign to a project in a different team', async function () {
                // Device (ATeam) cannot be assign to Project (BTeam)
                TestObjects.deviceProject = await app.db.models.Project.create({ name: generateProjectName(), type: '', url: '' })
                TestObjects.deviceProject.setTeam(TestObjects.BTeam)

                const device = await createDevice({ name: 'Ad1', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/devices/${device.id}`,
                    body: {
                        instance: TestObjects.deviceProject.id
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(400)
            })
            it('cannot assign to an application in a different team', async function () {
                // Device (ATeam) cannot be assign to Application in (BTeam)
                const device = await createDevice({ name: 'Ad1c', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
                TestObjects.Application2 = await app.factory.createApplication({ name: 'application-2' }, TestObjects.BTeam)
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/devices/${device.id}`,
                    body: {
                        application: TestObjects.Application2.hashid
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(400)
            })
        })

        describe('edit device settings', function () {
            it('can set env vars for the device', async function () {
                const device = await createDevice({ name: 'Ad1', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })

                await updateSettings(device, TestObjects.tokens.alice, { env: [{ name: 'a', value: 'foo' }] })

                const settings = await getSettings(device, TestObjects.tokens.alice)
                settings.should.have.property('env')
                const nonPlatformVars = settings.env.filter(e => !e.name.startsWith('FF_')) // ignore platform defined vars
                nonPlatformVars.should.have.length(1)
                nonPlatformVars[0].should.have.property('name', 'a')
                nonPlatformVars[0].should.have.property('value', 'foo')
                settings.should.not.have.property('invalid')
            })
            it('can set hidden env vars for the device', async function () {
                const device = await createDevice({ name: 'Ad1', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })

                await updateSettings(device, TestObjects.tokens.alice, { env: [{ name: 'a', value: 'foo' }, { name: 'b', value: 'bar', hidden: true }] })

                const settings = await getSettings(device, TestObjects.tokens.alice)
                settings.should.have.property('env')
                const nonPlatformVars = settings.env.filter(e => !e.name.startsWith('FF_')) // ignore platform defined vars
                nonPlatformVars.should.have.length(2)
                nonPlatformVars[0].should.have.property('name', 'a')
                nonPlatformVars[0].should.have.property('value', 'foo')
                nonPlatformVars[1].should.have.property('name', 'b')
                nonPlatformVars[1].should.have.property('value', '')
                nonPlatformVars[1].should.have.property('hidden', true)
                settings.should.not.have.property('invalid')
            })

            it('non team owner can set env vars for the device', async function () {
                const device = await createDevice({ name: 'Ad1', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })

                await updateSettings(device, TestObjects.tokens.chris, { env: [{ name: 'a', value: 'foo' }] })

                const settings = await getSettings(device, TestObjects.tokens.alice)
                settings.should.have.property('env')
                const nonPlatformVars = settings.env.filter(e => !e.name.startsWith('FF_')) // ignore platform defined vars
                nonPlatformVars.should.have.length(1)
                nonPlatformVars[0].should.have.property('name', 'a')
                nonPlatformVars[0].should.have.property('value', 'foo')
                settings.should.not.have.property('invalid')
            })
            it('owner set .npmrc', async function () {
                const device = await createDevice({ name: 'Ad2', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })

                await updateSettings(device, TestObjects.tokens.alice, {
                    palette: {
                        npmrc: '; testing',
                        catalogues: ['http://example.com/catalog.json']
                    }
                })

                const settings = await getSettings(device, TestObjects.tokens.alice)
                settings.should.have.property('palette')
                settings.palette.should.have.property('npmrc', '; testing')
                settings.palette.should.have.property('catalogues')
                settings.palette.catalogues.should.have.length(1)
                settings.palette.catalogues[0].should.equal('http://example.com/catalog.json')
            })

            it('can set httpNodeAuth to basic', async function () {
                const device = await createDevice({ name: 'AuthSettingsD1', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })

                await updateSettings(device, TestObjects.tokens.alice, {
                    security: {
                        httpNodeAuth: {
                            type: 'basic',
                            user: 'userName',
                            pass: 'passWord'
                        }
                    }
                })

                const settings = await getSettings(device, TestObjects.tokens.alice)

                settings.should.have.property('security')
                settings.security.should.have.property('httpNodeAuth')
                settings.security.httpNodeAuth.should.have.property('type', 'basic')
                settings.security.httpNodeAuth.should.have.property('user', 'userName')
                // Verify password isn't returned
                settings.security.httpNodeAuth.should.have.property('pass', true)

                // Verify the live settings include the hashed credentials
                let liveSettings = await getLiveSettings(device)
                liveSettings.should.have.property('security')
                liveSettings.security.should.have.property('httpNodeAuth')
                liveSettings.security.httpNodeAuth.should.have.property('type', 'basic')
                liveSettings.security.httpNodeAuth.should.have.property('user', 'userName')
                liveSettings.security.httpNodeAuth.should.have.property('pass')
                compareHash('passWord', liveSettings.security.httpNodeAuth.pass).should.be.true()

                // Verify that updating the username does not clear the password
                await updateSettings(device, TestObjects.tokens.alice, {
                    security: {
                        httpNodeAuth: {
                            type: 'basic',
                            user: 'newUserName'
                        }
                    }
                })
                liveSettings = await getLiveSettings(device)
                liveSettings.should.have.property('security')
                liveSettings.security.should.have.property('httpNodeAuth')
                liveSettings.security.httpNodeAuth.should.have.property('type', 'basic')
                liveSettings.security.httpNodeAuth.should.have.property('user', 'newUserName')
                liveSettings.security.httpNodeAuth.should.have.property('pass')
                compareHash('passWord', liveSettings.security.httpNodeAuth.pass).should.be.true()

                // Verify that changing to none clears out the credentials information
                await updateSettings(device, TestObjects.tokens.alice, { security: { httpNodeAuth: { } } })

                liveSettings = await getLiveSettings(device)
                liveSettings.should.have.property('security')
                liveSettings.security.should.have.property('httpNodeAuth', {})
            })
            it('can set httpNodeAuth to flowforge-user', async function () {
                const device = await createDevice({ name: 'AuthSettingsD2', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
                await updateSettings(device, TestObjects.tokens.alice, {
                    security: {
                        httpNodeAuth: {
                            type: 'flowforge-user'
                        }
                    }
                })

                const settings = await getSettings(device, TestObjects.tokens.alice)
                settings.should.have.property('security')
                settings.security.should.have.property('httpNodeAuth')
                settings.security.httpNodeAuth.should.have.property('type', 'flowforge-user')

                // Verify the deviceLive settings are updated
                let liveSettings = await getLiveSettings(device)
                liveSettings.should.have.property('security')
                liveSettings.security.should.have.property('httpNodeAuth')
                // Note: we map 'flowforge-user' to 'ff-user' for devices
                liveSettings.security.httpNodeAuth.should.have.property('type', 'ff-user')
                liveSettings.security.httpNodeAuth.should.have.property('clientID')
                liveSettings.security.httpNodeAuth.should.have.property('clientSecret')

                // Store the current values
                const { clientID, clientSecret } = liveSettings.security.httpNodeAuth

                const [deviceId] = app.db.models.Device.decodeHashid(device.id)
                let authClient = await app.db.models.AuthClient.findOne({ where: { ownerType: 'device', ownerId: '' + deviceId } })
                authClient.clientID.should.equal(clientID)
                compareHash(clientSecret, authClient.clientSecret).should.be.true()

                // Get the live settings again - verify the client credentials have been refreshed
                liveSettings = await getLiveSettings(device)
                liveSettings.security.httpNodeAuth.should.have.property('clientID')
                liveSettings.security.httpNodeAuth.should.have.property('clientSecret')
                liveSettings.security.httpNodeAuth.clientID.should.not.equal(clientID)
                liveSettings.security.httpNodeAuth.clientSecret.should.not.equal(clientSecret)

                // Verify that changing to none clears out the credentials information
                await updateSettings(device, TestObjects.tokens.alice, { security: { httpNodeAuth: { } } })

                liveSettings = await getLiveSettings(device)
                liveSettings.should.have.property('security')
                liveSettings.security.should.have.property('httpNodeAuth', {})

                // Verify the AuthClient has been removed
                authClient = await app.db.models.AuthClient.findOne({ where: { ownerType: 'device', ownerId: '' + deviceId } })
                should.not.exist(authClient)
            })
            it('can set localAuth for a device', async function () {
                const device = await createDevice({ name: 'LocalAuthSettingsD1', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
                await updateSettings(device, TestObjects.tokens.alice, {
                    security: {
                        localAuth: {
                            enabled: true,
                            user: 'local-user',
                            pass: '$Password'
                        }
                    }
                })

                const settings = await getSettings(device, TestObjects.tokens.alice)
                settings.should.have.property('security')
                settings.security.should.have.property('localAuth')
                settings.security.localAuth.should.have.property('enabled', true)
                settings.security.localAuth.should.have.property('user', 'local-user')
                settings.security.localAuth.should.have.property('pass', true)

                // Verify the deviceLive settings are present and the password is hashed
                let liveSettings = await getLiveSettings(device)
                liveSettings.should.have.property('security')
                liveSettings.security.should.have.property('localAuth').and.be.an.Object()
                liveSettings.security.localAuth.should.have.property('user', 'local-user')
                liveSettings.security.localAuth.should.have.property('pass')
                liveSettings.security.localAuth.pass.should.not.equal('$Password')
                compareHash('$Password', liveSettings.security.localAuth.pass).should.be.true()

                // Verify that disabling localAuth resets the enabled flag
                await updateSettings(device, TestObjects.tokens.alice, { security: { localAuth: { enabled: false } } })

                liveSettings = await getLiveSettings(device)
                liveSettings.should.have.property('security')
                liveSettings.security.should.have.property('localAuth').and.be.an.Object()
                liveSettings.security.localAuth.should.have.property('enabled', false)
            })
        })

        describe('device remote editor (unlicensed)', function () {
            it('details of a device does not includes tunnel info', async function () {
                const device = await createDevice({ name: 'Ad1', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
                const response = await app.inject({
                    method: 'GET',
                    url: `/api/v1/devices/${device.id}`,
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(200)
                const result = response.json()
                result.should.have.property('mode', 'autonomous') // while device mode is a licensed feature, it is still returned for unlicensed platforms (for device status)
                result.should.not.have.property('editor')
            })
            it('team owner can not set device to developer mode', async function () {
                const device = await createDevice({ name: 'Ad1', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/devices/${device.id}/mode`,
                    body: {
                        mode: 'developer'
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(400)
                const body = response.json()
                body.should.have.property('code', 'not_licensed')

                const settingsResponse = await app.inject({
                    method: 'GET',
                    url: `/api/v1/devices/${device.id}`,
                    cookies: { sid: TestObjects.tokens.alice }
                })

                const settings = settingsResponse.json()
                settings.should.have.property('mode', 'autonomous') // mode is not changed
            })
        })
        describe('device editor (licensed)', function () {
            before(async function () {
                const license = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGb3JnZSBJbmMuIERldmVsb3BtZW50IiwibmJmIjoxNjYyNTk1MjAwLCJleHAiOjc5ODcwNzUxOTksIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxNTAsInRlYW1zIjo1MCwicHJvamVjdHMiOjUwLCJkZXZpY2VzIjoyLCJkZXYiOnRydWUsImlhdCI6MTY2MjY1MzkyMX0.Tj4fnuDuxi_o5JYltmVi1Xj-BRn0aEjwRPa_fL2MYa9MzSwnvJEd-8bsRM38BQpChjLt-wN-2J21U7oSq2Fp5A'
                await app.close()
                await setupApp(license)
            })
            after(async function () {
                // After this set of tests, close the app and recreate (ie remove the license)
                await app.close()
                await setupApp()
            })
            it('details of a device includes mode but not tunnel info', async function () {
                const device = await createDevice({ name: 'Ad1', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
                const response = await app.inject({
                    method: 'GET',
                    url: `/api/v1/devices/${device.id}`,
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(200)
                const result = response.json()
                result.should.have.property('mode', 'autonomous') // by default, devices are in autonomous mode
                result.should.not.have.property('editor')
            })
            it('team owner can set device to developer mode', async function () {
                const device = await createDevice({ name: 'Ad1', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/devices/${device.id}/mode`,
                    body: {
                        mode: 'developer'
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(200)
                response.json().should.have.property('mode', 'developer')

                const settingsResponse = await app.inject({
                    method: 'GET',
                    url: `/api/v1/devices/${device.id}`,
                    cookies: { sid: TestObjects.tokens.alice }
                })

                const settings = settingsResponse.json()
                settings.should.have.property('mode', 'developer')
                settings.should.have.property('editor')
            })
            it('team member can set device to developer mode', async function () {
                const device = await createDevice({ name: 'Ad1', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/devices/${device.id}/mode`,
                    body: {
                        mode: 'developer'
                    },
                    cookies: { sid: TestObjects.tokens.chris }
                })
                response.statusCode.should.equal(200)
            })
        })
    })

    describe('Delete device', async function () {
        // DELETE /api/v1/devices/:deviceId
        // - Admin/Owner/Member
        it('team owner can delete device', async function () {
            const device = await createDevice({ name: 'Ad1', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
            const startTokenCount = await app.db.models.AccessToken.count({ where: { scope: 'device' } })
            startTokenCount.should.equal(1)
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/devices/${device.id}`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)
            const endTokenCount = await app.db.models.AccessToken.count({ where: { scope: 'device' } })
            endTokenCount.should.equal(0)
        })

        it('team member cannot delete device', async function () {
            // Chris (member) cannot delete from ATeam
            const device = await createDevice({ name: 'Ad1', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/devices/${device.id}`,
                cookies: { sid: TestObjects.tokens.chris }
            })
            response.statusCode.should.equal(403)
        })
    })

    describe('Create snapshot for instance owned device', async function () {
        let oldComms
        before(function () {
            // Prevent requests to devices hanging the snapshot process
            oldComms = app.comms
            app.comms = null
        })

        after(function () {
            app.comms = oldComms
        })

        it('creates a snapshot', async function () {
            const deviceProject = await app.db.models.Project.create({ name: generateProjectName(), type: '', url: '' })
            deviceProject.setTeam(TestObjects.ATeam)

            const device = await createDevice({ name: 'device-1', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice, instance: deviceProject.id })
            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/devices/${device.id}/snapshot`,
                body: {
                    name: 'new-snapshot',
                    description: 'snapshot-description',
                    setAsTarget: false
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            const result = response.json()

            result.should.have.property('name', 'new-snapshot')
            result.should.have.property('description', 'snapshot-description')
            result.should.have.property('ownerType', 'instance')

            result.user.should.have.property('username', 'alice')

            response.statusCode.should.equal(200)
        })

        it('fails gracefully if the device is assigned to neither an application or instance', async function () {
            const device = await createDevice({ name: 'device-1', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/devices/${device.id}/snapshot`,
                body: {
                    name: 'new-snapshot',
                    description: 'snapshot-description',
                    setAsTarget: false
                },
                cookies: { sid: TestObjects.tokens.alice }
            })

            const result = response.json()
            result.should.have.property('code', 'invalid_device')
            response.statusCode.should.equal(400)
        })

        it('fails gracefully if the device is assigned to an application', async function () {
            const agentVersion = '1.11.2'
            const device = await createDevice({ name: 'device-1', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice, application: TestObjects.Application1.hashid, agentVersion })
            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/devices/${device.id}/snapshot`,
                body: {
                    name: 'new-snapshot',
                    description: 'snapshot-description',
                    setAsTarget: false
                },
                cookies: { sid: TestObjects.tokens.alice }
            })

            const result = response.json()
            result.should.have.property('code', 'invalid_device')
            response.statusCode.should.equal(400)
        })
    })

    describe('Device Actions', async function () {
        // POST /api/v1/devices/:deviceId/actions/:action
        describe('with MQTT comms', async function () {
            const sendCommandAwaitReplyFaker = {}

            beforeEach(async function () {
                factory = app.factory
                sinon.stub(app.comms.devices, 'sendCommandAwaitReply').callsFake(async (...args) => {
                    const deviceId = args[1]
                    return sendCommandAwaitReplyFaker[deviceId](...args)
                })
                sinon.stub(app.comms.devices, 'sendCommand').resolves()
            })
            afterEach(async function () {
                sinon.restore()
            })
            it('team owner can trigger device restart action', async function () {
                const device = await factory.createDevice({}, TestObjects.ATeam, null, TestObjects.Application1)
                sendCommandAwaitReplyFaker[device.hashid] = () => new Promise((resolve) => { resolve({ success: true }) })
                sinon.stub(app.auditLog.Device.device, 'restarted').resolves()
                const response = await app.inject({
                    method: 'POST',
                    url: `/api/v1/devices/${device.hashid}/actions/restart`,
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(200)

                // status
                await device.reload()
                device.state.should.equal('restarting')

                // comms
                app.comms.devices.sendCommandAwaitReply.calledOnce.should.equal(true)
                app.comms.devices.sendCommandAwaitReply.firstCall.args[0].should.equal(TestObjects.ATeam.hashid)
                app.comms.devices.sendCommandAwaitReply.firstCall.args[1].should.equal(device.hashid)
                app.comms.devices.sendCommandAwaitReply.firstCall.args[2].should.equal('action')
                app.comms.devices.sendCommandAwaitReply.firstCall.args[3].should.deepEqual({ action: 'restart' })

                // audit log
                app.auditLog.Device.device.restarted.calledOnce.should.equal(true)
                app.auditLog.Device.device.restarted.firstCall.args.should.have.length(3)
                app.auditLog.Device.device.restarted.firstCall.args[0].should.be.an.Object() // the user object
                should(app.auditLog.Device.device.restarted.firstCall.args[1]).be.Null() // the error object
                app.auditLog.Device.device.restarted.firstCall.args[2].should.be.an.Object() // the device object
                app.auditLog.Device.device.restarted.firstCall.args[2].should.have.property('id', device.id)
            })
            it.skip('team owner can trigger device start action', async function () {
                const device = await factory.createDevice({}, TestObjects.ATeam, null, TestObjects.Application1)
                sendCommandAwaitReplyFaker[device.hashid] = () => new Promise((resolve) => { resolve({ success: true }) })
                sinon.stub(app.auditLog.Device.device, 'started').resolves()
                const response = await app.inject({
                    method: 'POST',
                    url: `/api/v1/devices/${device.hashid}/actions/start`,
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(200)

                // status
                await device.reload()
                device.state.should.equal('starting')

                // comms
                app.comms.devices.sendCommandAwaitReply.calledOnce.should.equal(true)
                app.comms.devices.sendCommandAwaitReply.firstCall.args[0].should.equal(TestObjects.ATeam.hashid)
                app.comms.devices.sendCommandAwaitReply.firstCall.args[1].should.equal(device.hashid)
                app.comms.devices.sendCommandAwaitReply.firstCall.args[2].should.equal('action')
                app.comms.devices.sendCommandAwaitReply.firstCall.args[3].should.deepEqual({ action: 'start' })

                // audit log
                app.auditLog.Device.device.started.calledOnce.should.equal(true)
                app.auditLog.Device.device.started.firstCall.args.should.have.length(3)
                app.auditLog.Device.device.started.firstCall.args[0].should.be.an.Object() // the user object
                should(app.auditLog.Device.device.started.firstCall.args[1]).be.Null() // the error object
                app.auditLog.Device.device.started.firstCall.args[2].should.be.an.Object() // the device object
                app.auditLog.Device.device.started.firstCall.args[2].should.have.property('id', device.id)
            })
            it.skip('team owner can trigger device suspend action', async function () {
                const device = await factory.createDevice({}, TestObjects.ATeam, null, TestObjects.Application1)
                sendCommandAwaitReplyFaker[device.hashid] = () => new Promise((resolve) => { resolve({ success: true }) })
                sinon.stub(app.auditLog.Device.device, 'suspended').resolves()
                const response = await app.inject({
                    method: 'POST',
                    url: `/api/v1/devices/${device.hashid}/actions/suspend`,
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(200)

                // status
                await device.reload()
                device.state.should.equal('suspending')

                // comms
                app.comms.devices.sendCommandAwaitReply.calledOnce.should.equal(true)
                app.comms.devices.sendCommandAwaitReply.firstCall.args[0].should.equal(TestObjects.ATeam.hashid)
                app.comms.devices.sendCommandAwaitReply.firstCall.args[1].should.equal(device.hashid)
                app.comms.devices.sendCommandAwaitReply.firstCall.args[2].should.equal('action')
                app.comms.devices.sendCommandAwaitReply.firstCall.args[3].should.deepEqual({ action: 'suspend' })

                // audit log
                app.auditLog.Device.device.suspended.calledOnce.should.equal(true)
                app.auditLog.Device.device.suspended.firstCall.args.should.have.length(3)
                app.auditLog.Device.device.suspended.firstCall.args[0].should.be.an.Object() // the user object
                should(app.auditLog.Device.device.suspended.firstCall.args[1]).be.Null() // the error object
                app.auditLog.Device.device.suspended.firstCall.args[2].should.be.an.Object() // the device object
                app.auditLog.Device.device.suspended.firstCall.args[2].should.have.property('id', device.id)
            })
            it('restart action returns 400 restart_failed when agent responds with success:false', async function () {
                const device = await factory.createDevice({}, TestObjects.ATeam, null, TestObjects.Application1)
                sendCommandAwaitReplyFaker[device.hashid] = () => new Promise((resolve) => { resolve({ success: false }) })
                sinon.stub(app.auditLog.Device.device, 'restarted').resolves()
                sinon.stub(app.auditLog.Device.device, 'restartFailed').resolves()
                device.state = 'xxx' // set state to something
                await device.save()
                const response = await app.inject({
                    method: 'POST',
                    url: `/api/v1/devices/${device.hashid}/actions/restart`,
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(400)

                const result = response.json()
                result.should.have.property('code', 'restart_failed')

                // status
                await device.reload()
                device.state.should.equal('xxx') // state should not have been changed

                // audit log
                app.auditLog.Device.device.restarted.called.should.equal(false)
                app.auditLog.Device.device.restartFailed.calledOnce.should.equal(true)
                app.auditLog.Device.device.restartFailed.firstCall.args.should.have.length(3)
                app.auditLog.Device.device.restartFailed.firstCall.args[0].should.be.an.Object() // the user object
                app.auditLog.Device.device.restartFailed.firstCall.args[1].should.be.an.Object() // the error object
                app.auditLog.Device.device.restartFailed.firstCall.args[2].should.be.an.Object() // the device object
                app.auditLog.Device.device.restartFailed.firstCall.args[2].should.have.property('id', device.id)
            })
            it.skip('start action returns 400 start_failed when agent responds with success:false', async function () {
                const device = await factory.createDevice({}, TestObjects.ATeam, null, TestObjects.Application1)
                sendCommandAwaitReplyFaker[device.hashid] = () => new Promise((resolve) => { resolve({ success: false }) })
                sinon.stub(app.auditLog.Device.device, 'started').resolves()
                sinon.stub(app.auditLog.Device.device, 'startFailed').resolves()
                device.state = 'xxx' // set state to something
                await device.save()
                const response = await app.inject({
                    method: 'POST',
                    url: `/api/v1/devices/${device.hashid}/actions/start`,
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(400)

                const result = response.json()
                result.should.have.property('code', 'start_failed')

                // status
                await device.reload()
                device.state.should.equal('xxx') // state should not have been changed

                // audit log
                app.auditLog.Device.device.started.called.should.equal(false)
                app.auditLog.Device.device.startFailed.calledOnce.should.equal(true)
                app.auditLog.Device.device.startFailed.firstCall.args.should.have.length(3)
                app.auditLog.Device.device.startFailed.firstCall.args[0].should.be.an.Object() // the user object
                app.auditLog.Device.device.startFailed.firstCall.args[1].should.be.an.Object() // the error object
                app.auditLog.Device.device.startFailed.firstCall.args[2].should.be.an.Object() // the device object
                app.auditLog.Device.device.startFailed.firstCall.args[2].should.have.property('id', device.id)
            })
            it.skip('suspend action returns 400 suspend_failed when agent responds with success:false', async function () {
                const device = await factory.createDevice({}, TestObjects.ATeam, null, TestObjects.Application1)
                sendCommandAwaitReplyFaker[device.hashid] = () => new Promise((resolve) => { resolve({ success: false }) })
                sinon.stub(app.auditLog.Device.device, 'suspended').resolves()
                sinon.stub(app.auditLog.Device.device, 'suspendFailed').resolves()
                device.state = 'xxx' // set state to something
                await device.save()
                const response = await app.inject({
                    method: 'POST',
                    url: `/api/v1/devices/${device.hashid}/actions/suspend`,
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(400)

                const result = response.json()
                result.should.have.property('code', 'suspend_failed')

                // status
                await device.reload()
                device.state.should.equal('xxx') // state should not have been changed

                // audit log
                app.auditLog.Device.device.suspended.called.should.equal(false)
                app.auditLog.Device.device.suspendFailed.calledOnce.should.equal(true)
                app.auditLog.Device.device.suspendFailed.firstCall.args.should.have.length(3)
                app.auditLog.Device.device.suspendFailed.firstCall.args[0].should.be.an.Object() // the user object
                app.auditLog.Device.device.suspendFailed.firstCall.args[1].should.be.an.Object() // the error object
                app.auditLog.Device.device.suspendFailed.firstCall.args[2].should.be.an.Object() // the device object
                app.auditLog.Device.device.suspendFailed.firstCall.args[2].should.have.property('id', device.id)
            })
            it('restart action returns 400 device_suspended when agent is suspended', async function () {
                const device = await factory.createDevice({}, TestObjects.ATeam, null, TestObjects.Application1)
                device.state = 'suspended'
                await device.save()
                const response = await app.inject({
                    method: 'POST',
                    url: `/api/v1/devices/${device.hashid}/actions/restart`,
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(400)

                const result = response.json()
                result.should.have.property('code', 'device_suspended')
            })
            it.skip('suspend action returns 400 device_suspended when agent is suspended', async function () {
                const device = await factory.createDevice({}, TestObjects.ATeam, null, TestObjects.Application1)
                device.state = 'suspended'
                await device.save()
                const response = await app.inject({
                    method: 'POST',
                    url: `/api/v1/devices/${device.hashid}/actions/suspend`,
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(400)

                const result = response.json()
                result.should.have.property('code', 'device_suspended')
            })

            it('team member cannot trigger restart action', async function () {
                const device = await factory.createDevice({}, TestObjects.ATeam, null, TestObjects.Application1)
                sendCommandAwaitReplyFaker[device.hashid] = () => new Promise((resolve) => { resolve({ success: true }) })
                const response = await app.inject({
                    method: 'POST',
                    url: `/api/v1/devices/${device.hashid}/actions/restart`,
                    cookies: { sid: TestObjects.tokens.chris }
                })
                response.statusCode.should.equal(403)
            })
            it.skip('team member cannot trigger start action', async function () {
                const device = await factory.createDevice({}, TestObjects.ATeam, null, TestObjects.Application1)
                sendCommandAwaitReplyFaker[device.hashid] = () => new Promise((resolve) => { resolve({ success: true }) })
                const response = await app.inject({
                    method: 'POST',
                    url: `/api/v1/devices/${device.hashid}/actions/start`,
                    cookies: { sid: TestObjects.tokens.chris }
                })
                response.statusCode.should.equal(403)
            })
            it.skip('team member cannot trigger suspend action', async function () {
                const device = await factory.createDevice({}, TestObjects.ATeam, null, TestObjects.Application1)
                sendCommandAwaitReplyFaker[device.hashid] = () => new Promise((resolve) => { resolve({ success: true }) })
                const response = await app.inject({
                    method: 'POST',
                    url: `/api/v1/devices/${device.hashid}/actions/suspend`,
                    cookies: { sid: TestObjects.tokens.chris }
                })
                response.statusCode.should.equal(403)
            })
            it('offline device times out for restart action', async function () {
                const device = await factory.createDevice({}, TestObjects.ATeam, null, TestObjects.Application1)
                device.state = 'xxx' // set state to something
                await device.save()
                sinon.stub(app.auditLog.Device.device, 'restarted').resolves()
                sinon.stub(app.auditLog.Device.device, 'restartFailed').resolves()

                sendCommandAwaitReplyFaker[device.hashid] = (...args) => {
                    // return the wrapped function but with a shortened timeout to hurry the test along
                    args[4] = args[4] || {}
                    args[4].timeout = 10 // short timeout
                    return app.comms.devices.sendCommandAwaitReply.wrappedMethod.apply(app.comms.devices, args)
                }
                const response = await app.inject({
                    method: 'POST',
                    url: `/api/v1/devices/${device.hashid}/actions/restart`,
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(400)
                response.json().should.have.property('code', 'no_response')

                // status
                await device.reload()
                device.state.should.equal('xxx') // state should not have been changed

                // Comms
                app.comms.devices.sendCommandAwaitReply.calledOnce.should.equal(true)
                app.comms.devices.sendCommandAwaitReply.firstCall.args[0].should.equal(TestObjects.ATeam.hashid)
                app.comms.devices.sendCommandAwaitReply.firstCall.args[1].should.equal(device.hashid)
                app.comms.devices.sendCommandAwaitReply.firstCall.args[2].should.equal('action')
                app.comms.devices.sendCommandAwaitReply.firstCall.args[3].should.deepEqual({ action: 'restart' })

                // audit log
                app.auditLog.Device.device.restarted.called.should.equal(false)
                app.auditLog.Device.device.restartFailed.calledOnce.should.equal(true)
                app.auditLog.Device.device.restartFailed.firstCall.args.should.have.length(3)
                app.auditLog.Device.device.restartFailed.firstCall.args[0].should.be.an.Object() // the user object
                app.auditLog.Device.device.restartFailed.firstCall.args[1].should.be.an.Object() // the error object
                app.auditLog.Device.device.restartFailed.firstCall.args[2].should.be.an.Object() // the device object
                app.auditLog.Device.device.restartFailed.firstCall.args[2].should.have.property('id', device.id)
            })
            it.skip('offline device times out for start action', async function () {
                const device = await factory.createDevice({}, TestObjects.ATeam, null, TestObjects.Application1)
                device.state = 'xxx' // set state to something
                await device.save()
                sinon.stub(app.auditLog.Device.device, 'started').resolves()
                sinon.stub(app.auditLog.Device.device, 'startFailed').resolves()

                sendCommandAwaitReplyFaker[device.hashid] = (...args) => {
                    // return the wrapped function but with a shortened timeout to hurry the test along
                    args[4] = args[4] || {}
                    args[4].timeout = 10 // short timeout
                    return app.comms.devices.sendCommandAwaitReply.wrappedMethod.apply(app.comms.devices, args)
                }
                const response = await app.inject({
                    method: 'POST',
                    url: `/api/v1/devices/${device.hashid}/actions/start`,
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(400)
                response.json().should.have.property('code', 'no_response')

                // status
                await device.reload()
                device.state.should.equal('xxx') // state should not have been changed

                // Comms
                app.comms.devices.sendCommandAwaitReply.calledOnce.should.equal(true)
                app.comms.devices.sendCommandAwaitReply.firstCall.args[0].should.equal(TestObjects.ATeam.hashid)
                app.comms.devices.sendCommandAwaitReply.firstCall.args[1].should.equal(device.hashid)
                app.comms.devices.sendCommandAwaitReply.firstCall.args[2].should.equal('action')
                app.comms.devices.sendCommandAwaitReply.firstCall.args[3].should.deepEqual({ action: 'start' })

                // audit log
                app.auditLog.Device.device.started.called.should.equal(false)
                app.auditLog.Device.device.startFailed.calledOnce.should.equal(true)
                app.auditLog.Device.device.startFailed.firstCall.args.should.have.length(3)
                app.auditLog.Device.device.startFailed.firstCall.args[0].should.be.an.Object() // the user object
                app.auditLog.Device.device.startFailed.firstCall.args[1].should.be.an.Object() // the error object
                app.auditLog.Device.device.startFailed.firstCall.args[2].should.be.an.Object() // the device object
                app.auditLog.Device.device.startFailed.firstCall.args[2].should.have.property('id', device.id)
            })
            it.skip('offline device times out for suspend action', async function () {
                const device = await factory.createDevice({}, TestObjects.ATeam, null, TestObjects.Application1)
                device.state = 'xxx' // set state to something
                await device.save()
                sinon.stub(app.auditLog.Device.device, 'suspended').resolves()
                sinon.stub(app.auditLog.Device.device, 'suspendFailed').resolves()

                sendCommandAwaitReplyFaker[device.hashid] = (...args) => {
                    // return the wrapped function but with a shortened timeout to hurry the test along
                    args[4] = args[4] || {}
                    args[4].timeout = 10 // short timeout
                    return app.comms.devices.sendCommandAwaitReply.wrappedMethod.apply(app.comms.devices, args)
                }
                const response = await app.inject({
                    method: 'POST',
                    url: `/api/v1/devices/${device.hashid}/actions/suspend`,
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(400)
                response.json().should.have.property('code', 'no_response')

                // status
                await device.reload()
                device.state.should.equal('xxx') // state should not have been changed

                // Comms
                app.comms.devices.sendCommandAwaitReply.calledOnce.should.equal(true)
                app.comms.devices.sendCommandAwaitReply.firstCall.args[0].should.equal(TestObjects.ATeam.hashid)
                app.comms.devices.sendCommandAwaitReply.firstCall.args[1].should.equal(device.hashid)
                app.comms.devices.sendCommandAwaitReply.firstCall.args[2].should.equal('action')
                app.comms.devices.sendCommandAwaitReply.firstCall.args[3].should.deepEqual({ action: 'suspend' })

                // audit log
                app.auditLog.Device.device.suspended.called.should.equal(false)
                app.auditLog.Device.device.suspendFailed.calledOnce.should.equal(true)
                app.auditLog.Device.device.suspendFailed.firstCall.args.should.have.length(3)
                app.auditLog.Device.device.suspendFailed.firstCall.args[0].should.be.an.Object() // the user object
                app.auditLog.Device.device.suspendFailed.firstCall.args[1].should.be.an.Object() // the error object
                app.auditLog.Device.device.suspendFailed.firstCall.args[2].should.be.an.Object() // the device object
                app.auditLog.Device.device.suspendFailed.firstCall.args[2].should.have.property('id', device.id)
            })
        })
        describe('without MQTT comms', async function () {
            let oldComms
            before(function () {
                // Prevent requests to devices hanging the snapshot process
                oldComms = app.comms
                app.comms = null
            })
            after(function () {
                app.comms = oldComms
            })
            it('restart results in error 400', async function () {
                const device = await factory.createDevice({}, TestObjects.ATeam, null, TestObjects.Application1)
                const response = await app.inject({
                    method: 'POST',
                    url: `/api/v1/devices/${device.hashid}/actions/restart`,
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(400)
                const body = response.json()
                body.should.have.property('code', 'no_device_comms')
                body.should.have.property('error', 'Actions are not available')
            })
            it.skip('start results in error 400', async function () {
                const device = await factory.createDevice({}, TestObjects.ATeam, null, TestObjects.Application1)
                const response = await app.inject({
                    method: 'POST',
                    url: `/api/v1/devices/${device.hashid}/actions/start`,
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(400)
                const body = response.json()
                body.should.have.property('code', 'no_device_comms')
                body.should.have.property('error', 'Actions are not available')
            })
            it.skip('suspend results in error 400', async function () {
                const device = await factory.createDevice({}, TestObjects.ATeam, null, TestObjects.Application1)
                const response = await app.inject({
                    method: 'POST',
                    url: `/api/v1/devices/${device.hashid}/actions/suspend`,
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(400)
                const body = response.json()
                body.should.have.property('code', 'no_device_comms')
                body.should.have.property('error', 'Actions are not available')
            })
        })
    })

    describe('Device Checkin', async function () {
        async function setupProjectWithSnapshot (setActive) {
            TestObjects.deviceProject = await app.db.models.Project.create({ name: generateProjectName(), type: '', url: '' })
            TestObjects.deviceProject.setTeam(TestObjects.ATeam)
            // Create a snapshot
            TestObjects.deviceProjectSnapshot = (await createSnapshot(TestObjects.deviceProject.id, 'test-snapshot', TestObjects.tokens.alice)).json()
            if (setActive) {
                // Set snapshot as active
                await app.inject({
                    method: 'POST',
                    url: `/api/v1/projects/${TestObjects.deviceProject.id}/devices/settings`,
                    body: {
                        targetSnapshot: TestObjects.deviceProjectSnapshot.id
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })
            }
        }
        it('device checks in with no snapshot', async function () {
            const device = await createDevice({ name: 'Ad1', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/devices/${device.id}/live/state`,
                headers: {
                    authorization: `Bearer ${device.credentials.token}`
                },
                payload: {
                    state: 'running',
                    health: {
                        uptime: 1,
                        snapshotRestartCount: 0
                    }
                }
            })
            response.statusCode.should.equal(409)
        })
        it('device checks in with a valid snapshot and settingsHash', async function () {
            await setupProjectWithSnapshot(true)

            const device = await createDevice({ name: 'Ad1', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
            const dbDevice = await app.db.models.Device.byId(device.id)
            await dbDevice.updateSettings({ settings: { env: [{ name: 'FOO', value: 'BAR' }] } })
            dbDevice.setProject(TestObjects.deviceProject)
            const deviceSettings = await TestObjects.deviceProject.getSetting('deviceSettings')
            dbDevice.targetSnapshotId = deviceSettings?.targetSnapshot
            await dbDevice.save()
            const settingsHash = dbDevice.settingsHash

            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/devices/${device.id}/live/state`,
                headers: {
                    authorization: `Bearer ${device.credentials.token}`
                },
                payload: {
                    snapshot: TestObjects.deviceProjectSnapshot.id,
                    settings: settingsHash,
                    state: 'running',
                    health: {
                        uptime: 1,
                        snapshotRestartCount: 0
                    }
                }
            })
            response.statusCode.should.equal(200)
        })
        it('device checks in with a invalid settingsHash', async function () {
            await setupProjectWithSnapshot(true)

            const device = await createDevice({ name: 'Ad1', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
            const dbDevice = await app.db.models.Device.byId(device.id)
            await dbDevice.updateSettings({ env: [{ name: 'FOO', value: 'BAR' }] })
            dbDevice.setProject(TestObjects.deviceProject)
            const deviceSettings = await TestObjects.deviceProject.getSetting('deviceSettings')
            dbDevice.targetSnapshotId = deviceSettings?.targetSnapshot
            await dbDevice.save()

            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/devices/${device.id}/live/state`,
                headers: {
                    authorization: `Bearer ${device.credentials.token}`
                },
                payload: {
                    snapshot: TestObjects.deviceProjectSnapshot.id,
                    settings: 'fooBar',
                    state: 'running',
                    health: {
                        uptime: 1,
                        snapshotRestartCount: 0
                    }
                }
            })
            response.statusCode.should.equal(409)
        })
        it('device checks in with a invalid snapshot id', async function () {
            await setupProjectWithSnapshot(true)

            const device = await createDevice({ name: 'Ad1', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
            const dbDevice = await app.db.models.Device.byId(device.id)
            await dbDevice.updateSettings({ env: [{ name: 'FOO', value: 'BAR' }] })
            dbDevice.setProject(TestObjects.deviceProject)
            const deviceSettings = await TestObjects.deviceProject.getSetting('deviceSettings')
            dbDevice.targetSnapshotId = deviceSettings?.targetSnapshot
            await dbDevice.save()

            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/devices/${device.id}/live/state`,
                headers: {
                    authorization: `Bearer ${device.credentials.token}`
                },
                payload: {
                    snapshot: dbUtils.getHashId('Device').encode(999),
                    settings: dbDevice.settingsHash,
                    state: 'running',
                    health: {
                        uptime: 1,
                        snapshotRestartCount: 0
                    }
                }
            })
            response.statusCode.should.equal(409)
        })
        it('device checks in with invalid token', async function () {
            await setupProjectWithSnapshot(true)

            const device = await createDevice({ name: 'Ad1', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/devices/${device.id}/live/state`,
                headers: {
                    authorization: 'Bearer NotAValidToken'
                },
                payload: {
                    state: 'running',
                    health: {
                        uptime: 1,
                        snapshotRestartCount: 0
                    }
                }
            })
            response.statusCode.should.equal(401)
        })
        it('device downloads settings', async function () {
            await setupProjectWithSnapshot(true)

            const device = await createDevice({ name: 'Ad1', type: 'Ad1_type', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
            const dbDevice = await app.db.models.Device.byId(device.id)
            await dbDevice.updateSettings({ env: [{ name: 'FOO', value: 'BAR' }] })
            dbDevice.setProject(TestObjects.deviceProject)
            const deviceSettings = await TestObjects.deviceProject.getSetting('deviceSettings')
            dbDevice.targetSnapshotId = deviceSettings?.targetSnapshot
            await dbDevice.save()
            const body = await getLiveSettings(device)
            body.should.have.property('hash').which.equal(dbDevice.settingsHash)
            body.should.have.property('env').which.have.property('FOO')
            body.should.have.property('env').which.have.property('FF_DEVICE_ID', device.id)
            body.should.have.property('env').which.have.property('FF_DEVICE_NAME', 'Ad1')
            body.should.have.property('env').which.have.property('FF_DEVICE_TYPE', 'Ad1_type')
            body.should.have.property('features').and.be.an.Object()
            body.features.should.have.property('projectComms', false)
            body.features.should.have.property('shared-library', false)
            body.should.not.have.property('editor')
        })
        it('device downloads settings with features enabled', async function () {
            await setupProjectWithSnapshot(true)

            const device = await createDevice({ name: 'Ad1', type: 'Ad1_type', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
            const dbDevice = await app.db.models.Device.byId(device.id)
            await dbDevice.updateSettings({ env: [{ name: 'FOO', value: 'BAR' }] })
            dbDevice.setProject(TestObjects.deviceProject)
            const deviceSettings = await TestObjects.deviceProject.getSetting('deviceSettings')
            dbDevice.targetSnapshotId = deviceSettings?.targetSnapshot
            await dbDevice.save()
            app.config.features.register('projectComms', true, true)
            app.config.features.register('shared-library', true, true)
            const body = await getLiveSettings(device)
            body.should.have.property('features').and.be.an.Object()
            body.features.should.have.property('projectComms', true)
            body.features.should.have.property('shared-library', true)
        })
        it('device downloads settings with editor version specified', async function () {
            const device = await createDevice({ name: 'Ad1', type: 'Ad1_type', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
            const dbDevice = await app.db.models.Device.byId(device.id)
            dbDevice.updateSettings({ editor: { nodeRedVersion: 'next' } })
            dbDevice.setApplication(TestObjects.Application1)
            await dbDevice.save()

            const body = await getLiveSettings(device)
            body.should.have.property('editor').and.be.an.Object()
            body.editor.should.have.property('nodeRedVersion', 'next')
        })
    })

    describe('Device state', function () {
        async function setupProjectWithSnapshot (setActive) {
            TestObjects.deviceProject = await app.db.models.Project.create({ name: generateProjectName(), type: '', url: '' })
            TestObjects.deviceProject.setTeam(TestObjects.ATeam)
            // Create a snapshot
            TestObjects.deviceProjectSnapshot = (await createSnapshot(TestObjects.deviceProject.id, 'test-snapshot', TestObjects.tokens.alice)).json()
            if (setActive) {
                // Set snapshot as active
                await app.inject({
                    method: 'POST',
                    url: `/api/v1/projects/${TestObjects.deviceProject.id}/devices/settings`,
                    body: {
                        targetSnapshot: TestObjects.deviceProjectSnapshot.id
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })
            }
        }
        describe('unlicensed', function () {
            it('gets live state', async function () {
                await setupProjectWithSnapshot(true)
                const device = await createDevice({ name: 'dev_lst_1', type: 'dev_lst_1_type', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
                const dbDevice = await app.db.models.Device.byId(device.id)
                dbDevice.setProject(TestObjects.deviceProject)
                const deviceSettings = await TestObjects.deviceProject.getSetting('deviceSettings')
                dbDevice.targetSnapshotId = deviceSettings?.targetSnapshot
                await dbDevice.save()

                const response = await app.inject({
                    method: 'GET',
                    url: `/api/v1/devices/${device.id}/live/state`,
                    headers: {
                        authorization: `Bearer ${device.credentials.token}`,
                        'content-type': 'application/json'
                    }
                })
                const body = JSON.parse(response.body)
                response.statusCode.should.equal(200)
                body.should.have.keys('project', 'snapshot', 'settings', 'mode', 'licensed')
                body.licensed.should.equal(false)
            })
        })
        describe('licensed', function () {
            before(async function () {
                const license = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGb3JnZSBJbmMuIERldmVsb3BtZW50IiwibmJmIjoxNjYyNTk1MjAwLCJleHAiOjc5ODcwNzUxOTksIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxNTAsInRlYW1zIjo1MCwicHJvamVjdHMiOjUwLCJkZXZpY2VzIjoyLCJkZXYiOnRydWUsImlhdCI6MTY2MjY1MzkyMX0.Tj4fnuDuxi_o5JYltmVi1Xj-BRn0aEjwRPa_fL2MYa9MzSwnvJEd-8bsRM38BQpChjLt-wN-2J21U7oSq2Fp5A'
                await app.close()
                await setupApp(license)
            })
            after(async function () {
                // After this set of tests, close the app and recreate (ie remove the license)
                await app.close()
                await setupApp()
            })
            it('gets live state', async function () {
                await setupProjectWithSnapshot(true)
                const device = await createDevice({ name: 'Ad1', type: 'Ad1_type', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
                const dbDevice = await app.db.models.Device.byId(device.id)
                dbDevice.setProject(TestObjects.deviceProject)
                const deviceSettings = await TestObjects.deviceProject.getSetting('deviceSettings')
                dbDevice.targetSnapshotId = deviceSettings?.targetSnapshot
                await dbDevice.save()

                const response = await app.inject({
                    method: 'GET',
                    url: `/api/v1/devices/${device.id}/live/state`,
                    headers: {
                        authorization: `Bearer ${device.credentials.token}`,
                        'content-type': 'application/json'
                    }
                })
                const body = JSON.parse(response.body)
                response.statusCode.should.equal(200)
                body.should.have.keys('project', 'snapshot', 'settings', 'mode', 'licensed')
                body.licensed.should.equal(true)
            })
        })
    })

    describe('Get list of a teams devices', async function () {
        async function listDevices (options) {
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${options.team}/devices`,
                cookies: { sid: options.as }
            })
            return response.json()
        }
        it('lists devices in team', async function () {
            // GET /api/v1/team/:teamId/devices
            // - Admin/Owner/Member
            await createDevice({ name: 'Ad1', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
            await createDevice({ name: 'Ad2', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
            await createDevice({ name: 'Ad3', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
            await createDevice({ name: 'Bd1', type: '', team: TestObjects.BTeam.hashid, as: TestObjects.tokens.bob })
            await createDevice({ name: 'Bd2', type: '', team: TestObjects.BTeam.hashid, as: TestObjects.tokens.bob })

            const teamAList = await listDevices({ team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
            teamAList.should.have.property('count', 3)

            const teamBList = await listDevices({ team: TestObjects.BTeam.hashid, as: TestObjects.tokens.bob })
            teamBList.should.have.property('count', 2)

            const teamCList = await listDevices({ team: TestObjects.CTeam.hashid, as: TestObjects.tokens.chris })
            teamCList.should.have.property('count', 0)
        })
    })
    describe('Get list of a application devices', async function () {
        async function listDevices (options) {
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/applications/${options.application}/devices`,
                cookies: { sid: options.as }
            })
            return response.json()
        }
        it('lists devices in an application', async function () {
            // GET /api/v1/applications/:applicationId/devices
            TestObjects.Application2 = await app.factory.createApplication({ name: 'application-2' }, TestObjects.BTeam)
            const agentVersion = '1.11.0' // min agent version required for application assignment

            await createDevice({ name: 'Ad1', type: '', application: TestObjects.Application1.hashid, team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice, agentVersion })
            await createDevice({ name: 'Ad2', type: '', application: TestObjects.Application1.hashid, team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice, agentVersion })
            await createDevice({ name: 'Ad3', type: '', application: TestObjects.Application1.hashid, team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice, agentVersion })
            await createDevice({ name: 'Bd1', type: '', application: TestObjects.Application2.hashid, team: TestObjects.BTeam.hashid, as: TestObjects.tokens.bob, agentVersion })
            await createDevice({ name: 'Bd2', type: '', application: TestObjects.Application2.hashid, team: TestObjects.BTeam.hashid, as: TestObjects.tokens.bob, agentVersion })

            const app1List = await listDevices({ application: TestObjects.Application1.hashid, as: TestObjects.tokens.alice })
            app1List.should.have.property('count', 3)

            const app2List = await listDevices({ application: TestObjects.Application2.hashid, as: TestObjects.tokens.bob })
            app2List.should.have.property('count', 2)
        })
    })
})
