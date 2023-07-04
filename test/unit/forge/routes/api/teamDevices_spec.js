const { Op } = require('sequelize')
const should = require('should') // eslint-disable-line
const { Roles } = require('../../../../../forge/lib/roles')
const setup = require('../setup')

describe('Team Devices API', function () {
    let app
    /** @type {import('../../../../../forge/db/controllers/AccessToken') */
    let AccessTokenController
    const TestObjects = {}
    before(async function () {
        const opts = {}
        app = await setup(opts)
        AccessTokenController = app.db.controllers.AccessToken

        // Alice (created in setup()) is an admin of the platform
        TestObjects.alice = await app.db.models.User.byUsername('alice')
        TestObjects.bob = await app.db.models.User.create({ username: 'bob', name: 'Bob Solo', email: 'bob@example.com', email_verified: true, password: 'bbPassword' })
        TestObjects.chris = await app.db.models.User.create({ username: 'chris', name: 'Chris Kenobi', email: 'chris@example.com', email_verified: true, password: 'ccPassword' })
        // non admin, not in any team
        TestObjects.dave = await app.db.models.User.create({ username: 'dave', name: 'Dave Vader', email: 'dave@example.com', password: 'ddPassword', email_verified: true, password_expired: false })

        TestObjects.ATeam = app.team
        TestObjects.Project1 = app.project

        // set bob as an owner of ATeam
        await TestObjects.ATeam.addUser(TestObjects.bob, { through: { role: Roles.Owner } })
        // set chris as a member of ATeam
        await TestObjects.ATeam.addUser(TestObjects.chris, { through: { role: Roles.Member } })

        // create 1 device for ATeam
        TestObjects.Device1 = await app.db.models.Device.create({
            name: 'device 1',
            type: 'test device',
            credentialSecret: ''
        })
        await TestObjects.ATeam.addDevice(TestObjects.Device1)

        TestObjects.tokens = {}
        await login('alice', 'aaPassword')
        await login('bob', 'bbPassword')
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

    beforeEach(async function () {
        TestObjects.provisioningTokens = {
            token1: await AccessTokenController.createTokenForTeamDeviceProvisioning('Provisioning Token 1', TestObjects.ATeam),
            token2: await AccessTokenController.createTokenForTeamDeviceProvisioning('Provisioning Token 2', TestObjects.ATeam, TestObjects.Project1)
        }
    })
    afterEach(async function () {
        await app.db.models.AccessToken.destroy({
            where: {
                ownerType: 'team',
                scope: { [Op.substring]: 'device:provision' }
            }
        })
    })
    after(async function () {
        if (app) {
            await app.close()
            app = null
        }
    })
    describe('Team Devices', function () {
        // GET /api/v1/team/:teamId/devices
        // needsPermission('team:device:list')

        it('Get a list of devices owned by this team', async function () {
            // first ensure we have 1 device (added in beforeEach)
            const currentDeviceCount = await app.db.models.Device.count()
            should(currentDeviceCount).equal(1)

            // add 2 devices
            const device1 = await app.db.models.Device.create({
                name: 'device 2',
                type: 'test device',
                credentialSecret: ''
            })
            await TestObjects.ATeam.addDevice(device1)
            const device2 = await app.db.models.Device.create({
                name: 'device 3',
                type: 'test device',
                credentialSecret: ''
            })
            await TestObjects.ATeam.addDevice(device2)

            // check that we get 2 devices
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${TestObjects.ATeam.hashid}/devices`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.property('devices').and.be.an.Array()
            result.devices.should.have.a.property('length', 3)
        })
        it('Non member does not get a list of devices', async function () {
            // GET /api/v1/team/:teamId/devices
            await login('dave', 'ddPassword')
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${TestObjects.ATeam.hashid}/devices`,
                cookies: { sid: TestObjects.tokens.dave }
            })
            response.statusCode.should.equal(404) // not found
        })
    })
    describe('Provisioning Tokens', function () {
        it('Get list of provisioning tokens for the team', async function () {
            // /api/v1/team/:teamId/devices/provisioning
            // needsPermission('team:device:provisioning-token:list')  (must be admin or team owner)
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${TestObjects.ATeam.hashid}/devices/provisioning`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.property('tokens').and.be.an.Array()
            result.tokens.should.have.length(2)
        })
        it('Non owner cannot get list of provisioning tokens', async function () {
            // /api/v1/team/:teamId/devices/provisioning
            // needsPermission('team:device:provisioning-token:list')  (must be admin or team owner)
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${TestObjects.ATeam.hashid}/devices/provisioning`,
                cookies: { sid: TestObjects.tokens.chris }
            })
            response.statusCode.should.equal(401)
            const result = response.json()
            result.should.have.property('code', 'unauthorized')
            result.should.have.property('error', 'unauthorized')
        })
        it('Generate a provisioning token for the team', async function () {
            // POST /api/v1/team/:teamId/devices/provisioning
            // needsPermission('team:device:provisioning-token:create')  (must be admin or team owner)
            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/teams/${TestObjects.ATeam.hashid}/devices/provisioning`,
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    name: 'Provisioning Token'
                }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.only.keys('token', 'id', 'name', 'expiresAt', 'team')
            result.should.have.property('id').and.be.a.String()
            result.should.have.property('name', 'Provisioning Token')
            result.should.have.property('team', TestObjects.ATeam.hashid)
            result.should.have.property('token').and.be.a.String()
        })
        it('Generate a provisioning token with assigned project', async function () {
            // POST /api/v1/team/:teamId/devices/provisioning
            // needsPermission('team:device:provisioning-token:create')  (must be admin or team owner)
            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/teams/${TestObjects.ATeam.hashid}/devices/provisioning`,
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    name: 'Provisioning Token',
                    instance: TestObjects.Project1.id
                }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.only.keys('token', 'id', 'name', 'expiresAt', 'team', 'instance')
            result.should.have.property('token').and.be.a.String()
            result.should.have.property('id').and.be.a.String()
            result.should.have.property('name', 'Provisioning Token')
            result.should.have.property('team', TestObjects.ATeam.hashid)
            result.should.have.property('instance', TestObjects.Project1.id)
        })
        it('Cannot generate a provisioning token with invalid name', async function () {
            // POST /api/v1/team/:teamId/devices/provisioning
            // needsPermission('team:device:provisioning-token:create')  (must be admin or team owner)
            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/teams/${TestObjects.ATeam.hashid}/devices/provisioning`,
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    name: 'token,name:scope:none' // invalid name (trying to inject a scope)
                }
            })
            response.statusCode.should.equal(400)
            const result = response.json()
            result.should.have.property('code', 'unexpected_error')
            result.should.have.property('error')
        })
        it('Edit a provisioning token to assign a project', async function () {
            // PUT /api/v1/team/:teamId/devices/provisioning/:tokenId
            // needsPermission('team:device:provisioning-token:edit')  (must be admin or team owner)
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/teams/${TestObjects.ATeam.hashid}/devices/provisioning/${TestObjects.provisioningTokens.token1.id}`,
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    instance: TestObjects.Project1.id
                }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.only.keys('id', 'name', 'expiresAt', 'team', 'instance')
            result.should.have.property('id', TestObjects.provisioningTokens.token1.id)
            result.should.have.property('name', 'Provisioning Token 1')
            result.should.have.property('team', TestObjects.ATeam.hashid)
            result.should.have.property('instance', TestObjects.Project1.id)
        })
        it('Edit a provisioning token to unassign a project', async function () {
            // PUT /api/v1/team/:teamId/devices/provisioning/:tokenId
            // needsPermission('team:device:provisioning-token:edit')  (must be admin or team owner)
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/teams/${TestObjects.ATeam.hashid}/devices/provisioning/${TestObjects.provisioningTokens.token2.id}`,
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    instance: null
                }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.only.keys('id', 'name', 'expiresAt', 'team')
            result.should.have.property('id', TestObjects.provisioningTokens.token2.id)
            result.should.have.property('name', 'Provisioning Token 2')
            result.should.have.property('team', TestObjects.ATeam.hashid)
        })
        it('Non Team Owner cannot edit a provisioning token', async function () {
            // PUT /api/v1/team/:teamId/devices/provisioning/:tokenId
            // needsPermission('team:device:provisioning-token:edit')  (must be admin or team owner)
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/teams/${TestObjects.ATeam.hashid}/devices/provisioning/${TestObjects.provisioningTokens.token2.id}`,
                cookies: { sid: TestObjects.tokens.chris },
                payload: {
                    instance: null
                }
            })
            response.statusCode.should.equal(401)
            const result = response.json()
            result.should.have.property('code', 'unauthorized')
            result.should.have.property('error', 'unauthorized')
        })
        it('Edit a provisioning token to assign a project that does not exist', async function () {
            // TODO: This should return a 404
        })
        it('Edit a provisioning token to assign a project that is not in the team', async function () {
            // TODO: This should return a 404
        })
        it('Delete a provisioning token', async function () {
            // DELETE /api/v1/team/:teamId/devices/provisioning/:tokenId
            // needsPermission('team:device:provisioning-token:delete')  (must be admin or team owner)
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/teams/${TestObjects.ATeam.hashid}/devices/provisioning/${TestObjects.provisioningTokens.token1.id}`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.property('status', 'okay')
        })
        it('Non Team Owner cannot delete a provisioning token', async function () {
            // DELETE /api/v1/team/:teamId/devices/provisioning/:tokenId
            // needsPermission('team:device:provisioning-token:delete')  (must be admin or team owner)
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/teams/${TestObjects.ATeam.hashid}/devices/provisioning/${TestObjects.provisioningTokens.token1.id}`,
                cookies: { sid: TestObjects.tokens.chris }
            })
            response.statusCode.should.equal(401)
            const result = response.json()
            result.should.have.property('code', 'unauthorized')
            result.should.have.property('error', 'unauthorized')
        })
    })
})
