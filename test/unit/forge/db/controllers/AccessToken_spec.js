const should = require('should') // eslint-disable-line
const setup = require('../setup')

describe('AccessToken controller', function () {
    // Use standard test data.
    let app
    /** @type {import('../../../../../forge/db/controllers/AccessToken') */
    let AccessTokenController
    /** @type {import('../../../../lib/TestModelFactory')} */
    let factory
    const TestObjects = {}

    before(async function () {
        app = await setup()
        factory = app.factory
        AccessTokenController = app.db.controllers.AccessToken
        TestObjects.alice = await app.db.models.User.byUsername('alice')
        TestObjects.team = await app.db.models.Team.byName('ATeam')
        TestObjects.project = await app.db.models.Project.create({ name: 'project', type: '', url: '' })
        await TestObjects.team.addProject(TestObjects.project)
        TestObjects.application = app.application
        TestObjects.device = await factory.createDevice({ name: 'device' }, TestObjects.team, null, TestObjects.application)
    })

    after(async function () {
        await app.close()
    })

    afterEach(async function () {
        await app.db.models.AccessToken.destroy({ where: {} })
    })

    describe('Project Tokens', function () {
        it('creates a token for a project', async function () {
            ;(await app.db.models.AccessToken.count()).should.equal(0)
            const result = await app.db.controllers.AccessToken.createTokenForProject(TestObjects.project, Date.now() + 5000, 'test:scope')
            ;(await app.db.models.AccessToken.count()).should.equal(1)
            result.should.have.property('token')

            const token = await app.db.controllers.AccessToken.getOrExpire(result.token)
            should.exist(token)
            token.should.have.property('scope', ['test:scope'])
            token.should.have.property('ownerId', TestObjects.project.id)
            token.should.have.property('ownerType', 'project')
        })

        it('replaces a token for a project', async function () {
            // Setup the inital token
            ;(await app.db.models.AccessToken.count()).should.equal(0)
            const result = await app.db.controllers.AccessToken.createTokenForProject(TestObjects.project, Date.now() + 5000, 'test:scope')
            ;(await app.db.models.AccessToken.count()).should.equal(1)
            result.should.have.property('token')

            // Renew the token
            const renewResult = await app.db.controllers.AccessToken.createTokenForProject(TestObjects.project, Date.now() + 5000, 'test:scope')
            // Check we don't have two tokens in the database
            ;(await app.db.models.AccessToken.count()).should.equal(1)
            renewResult.should.have.property('token')

            result.token.should.not.equal(renewResult.token)
            should.not.exist(await app.db.controllers.AccessToken.getOrExpire(result.token))

            const token = await app.db.controllers.AccessToken.getOrExpire(renewResult.token)
            should.exist(token)
            token.should.have.property('scope', ['test:scope'])
            token.should.have.property('ownerId', TestObjects.project.id)
            token.should.have.property('ownerType', 'project')
        })
    })

    describe('Device Provisioning Tokens', function () {
        it('creates a provisioning token for a team', async function () {
            ;(await app.db.models.AccessToken.count()).should.equal(0)
            const result = await AccessTokenController.createTokenForTeamDeviceProvisioning('Provisioning Token 1', TestObjects.team, null, Date.now() + 5000)
            ;(await app.db.models.AccessToken.count()).should.equal(1)
            result.should.have.property('token')

            const token = await AccessTokenController.getOrExpire(result.token)
            should.exist(token)
            token.should.have.property('scope', ['device:provision', 'name:Provisioning Token 1'])
            token.should.have.property('ownerId', '' + TestObjects.team.id)
            token.should.have.property('ownerType', 'team')
            token.should.have.property('id') // AccessToken table now has an id column
        })

        it('creates a provisioning token for a teams project', async function () {
            ;(await app.db.models.AccessToken.count()).should.equal(0)
            const result = await AccessTokenController.createTokenForTeamDeviceProvisioning('Provisioning Token 2', TestObjects.team, TestObjects.project, Date.now() + 5000)
            ;(await app.db.models.AccessToken.count()).should.equal(1)
            result.should.have.property('token')

            const token = await AccessTokenController.getOrExpire(result.token)
            should.exist(token)
            token.should.have.property('scope', ['device:provision', 'name:Provisioning Token 2', 'project:' + TestObjects.project.id])
            token.should.have.property('ownerId', '' + TestObjects.team.id)
            token.should.have.property('ownerType', 'team')
            token.should.have.property('id') // AccessToken table now has an id column
        })

        it('edits a provisioning token to set the project', async function () {
            ;(await app.db.models.AccessToken.count()).should.equal(0)
            const result = await AccessTokenController.createTokenForTeamDeviceProvisioning('Provisioning Token', TestObjects.team, null, Date.now() + 5000)
            ;(await app.db.models.AccessToken.count()).should.equal(1)
            result.should.have.property('token')

            const token = await AccessTokenController.getOrExpire(result.token)
            should.exist(token)
            token.should.have.property('scope', ['device:provision', 'name:Provisioning Token'])

            await AccessTokenController.updateTokenForTeamDeviceProvisioning(token, TestObjects.project) // update the token to have a project
            ;(await app.db.models.AccessToken.count()).should.equal(1) // should still have only 1 token
            const editedToken = await AccessTokenController.getOrExpire(result.token)
            should.exist(editedToken)
            editedToken.should.have.property('scope', ['device:provision', 'name:Provisioning Token', 'project:' + TestObjects.project.id])
        })

        it('edits a provisioning token to remove the project', async function () {
            ;(await app.db.models.AccessToken.count()).should.equal(0)
            const result = await AccessTokenController.createTokenForTeamDeviceProvisioning('Provisioning Token', TestObjects.team, TestObjects.project, Date.now() + 5000)
            ;(await app.db.models.AccessToken.count()).should.equal(1)
            result.should.have.property('token')

            const token = await AccessTokenController.getOrExpire(result.token)
            should.exist(token)
            token.should.have.property('scope', ['device:provision', 'name:Provisioning Token', 'project:' + TestObjects.project.id])

            await AccessTokenController.updateTokenForTeamDeviceProvisioning(token, null) // update the token to have a project
            ;(await app.db.models.AccessToken.count()).should.equal(1) // should still have only 1 token
            const editedToken = await AccessTokenController.getOrExpire(result.token)
            should.exist(editedToken)
            editedToken.should.have.property('scope', ['device:provision', 'name:Provisioning Token'])
        })

        describe('Device Quick Connect One-Time-Code', function () {
            it('creates a one-time-code token and a device access token', async function () {
                ;(await app.db.models.AccessToken.count()).should.equal(0)
                const dbDevice = await app.db.models.Device.byId(TestObjects.device.hashid)
                const originalCredentials = await dbDevice.refreshAuthTokens({ refreshOTC: true })
                ;(await app.db.models.AccessToken.count()).should.equal(2) // should have 2 tokens, one for the device, one for the otc

                // check otc is a string in the format ss-ss-ss (3 groups of 2 or more characters)
                originalCredentials.should.have.property('otc').and.be.a.String()
                originalCredentials.otc.should.match(/^\w{2,}-\w{2,}-\w{2,}$/)

                const otcBase64 = Buffer.from(originalCredentials.otc).toString('base64')

                const token = await AccessTokenController.getOrExpire(otcBase64)
                should.exist(token)
                token.should.have.property('scope', ['device:otc'])
                token.should.have.property('ownerId', '' + TestObjects.device.id)
                token.should.have.property('ownerType', 'device')
                token.should.have.property('expiresAt').and.be.a.Date()
                token.expiresAt.getTime().should.be.above(Date.now() + (1000 * 60 * 60 * 23)) // 23 hours
                token.expiresAt.getTime().should.be.below(Date.now() + (1000 * 60 * 60 * 25)) // 25 hours
            })
            it('returns null for unknown token', async function () {
                ;(await app.db.models.AccessToken.count()).should.equal(0)
                const dbDevice = await app.db.models.Device.byId(TestObjects.device.hashid)
                const originalCredentials = await dbDevice.refreshAuthTokens({ refreshOTC: true })
                ;(await app.db.models.AccessToken.count()).should.equal(2) // should have 2 tokens, one for the device, one for the otc

                // check otc was actually created
                originalCredentials.should.have.property('otc').and.be.a.String()

                const badOTC = originalCredentials.otc + '-bad'
                const otcBase64 = Buffer.from(badOTC).toString('base64')

                const token = await AccessTokenController.getOrExpire(otcBase64)
                should(token).be.null()
            })
            it('recreates one-time-code token, there can only be one', async function () {
                // Premise:
                // A device can only have one otc at a time in the AccessToken table
                // Calling createDeviceOTC() will create a new otc, and delete any existing otc for the device

                ;(await app.db.models.AccessToken.count()).should.equal(0)
                const initialOTC = await AccessTokenController.createDeviceOTC(TestObjects.device)
                ;(await app.db.models.AccessToken.count()).should.equal(1)

                // check otc is a string in the format ss-ss-ss (3 groups of 2 or more characters)
                initialOTC.should.have.property('otc').and.be.a.String()
                initialOTC.otc.should.match(/^\w{2,}-\w{2,}-\w{2,}$/)

                // create a new otc for the same device
                const newOTC = await AccessTokenController.createDeviceOTC(TestObjects.device)
                ;(await app.db.models.AccessToken.count()).should.equal(1) // should still only have 1 token

                // should be different
                newOTC.should.have.property('otc').and.be.a.String()
                newOTC.otc.should.match(/^\w{2,}-\w{2,}-\w{2,}$/)
                newOTC.otc.should.not.equal(initialOTC.otc)
            })
            it('does not create a one-time-code when refreshing device tokens with `refreshOTC: false`', async function () {
                ;(await app.db.models.AccessToken.count()).should.equal(0)
                const dbDevice = await app.db.models.Device.byId(TestObjects.device.hashid)
                const creds = await dbDevice.refreshAuthTokens({ refreshOTC: false })
                ;(await app.db.models.AccessToken.count()).should.equal(1) // should have 1 token, one for the device
                creds.should.not.have.property('otc')
                // double check the token in the db is NOT an otc token
                const tokens = await app.db.models.AccessToken.findAll()
                tokens.should.have.length(1)
                tokens[0].should.have.property('scope', ['device'])
            })
        })
    })

    describe('User Tokens', function () {
        it('creates a token for a user - id only', async function () {
            const result = await app.db.controllers.AccessToken.createTokenForUser(
                TestObjects.alice.id,
                null,
                ['test:scope']
            )
            result.should.have.property('token')
            should.not.exist(result.expiresAt)
            should.not.exist(result.refreshToken)
        })
        it('creates a token for a user - full object', async function () {
            const result = await app.db.controllers.AccessToken.createTokenForUser(
                TestObjects.alice,
                null,
                ['test:scope']
            )
            result.should.have.property('token')
            should.not.exist(result.expiresAt)
            should.not.exist(result.refreshToken)
        })
        it('creates a token for a user with refresh token', async function () {
            const result = await app.db.controllers.AccessToken.createTokenForUser(
                TestObjects.alice,
                null,
                ['test:scope'],
                true
            )
            result.should.have.property('token')
            should.exist(result.expiresAt)
            should.exist(result.refreshToken)
        })

        it('refreshes a valid token', async function () {
            // Create token
            ;(await app.db.models.AccessToken.count()).should.equal(0)
            const original = await app.db.controllers.AccessToken.createTokenForUser(
                TestObjects.alice,
                null,
                ['test:scope'],
                true
            )
            ;(await app.db.models.AccessToken.count()).should.equal(1)

            const refreshResult = await app.db.controllers.AccessToken.refreshToken(original.refreshToken)
            should.exist(refreshResult.token)
            refreshResult.token.should.not.equal(original.token)
            should.exist(refreshResult.refreshToken)
            refreshResult.refreshToken.should.not.equal(original.refreshToken)
            should.exist(refreshResult.expiresAt)
            ;(await app.db.models.AccessToken.count()).should.equal(1)
            should.not.exist(await app.db.controllers.AccessToken.getOrExpire(original.token))
        })
    })

    describe('getOrExpire', function () {
        it('does not return expired tokens', async function () {
            ;(await app.db.models.AccessToken.count()).should.equal(0)
            // Create the token with an already-expired time
            const result = await app.db.controllers.AccessToken.createTokenForProject(TestObjects.project, Date.now() - 5000, 'test:scope')
            ;(await app.db.models.AccessToken.count()).should.equal(1)
            should.not.exist(await app.db.controllers.AccessToken.getOrExpire(result.token))
        })
    })

    describe('destroyToken', function () {
        it('removes token', async function () {
            ;(await app.db.models.AccessToken.count()).should.equal(0)
            const result = await app.db.controllers.AccessToken.createTokenForProject(TestObjects.project, Date.now() + 5000, 'test:scope')
            ;(await app.db.models.AccessToken.count()).should.equal(1)

            // Now destroy the token
            await app.db.controllers.AccessToken.destroyToken(result.token)
            ;(await app.db.models.AccessToken.count()).should.equal(0)
        })
    })

    describe('passwordReset Tokens', function () {
        it('generates a password reset token for a known user', async function () {
            ;(await app.db.models.AccessToken.count({ where: { scope: 'password:reset' } })).should.equal(0)
            const originalToken = await app.db.controllers.AccessToken.createTokenForPasswordReset(TestObjects.alice)
            ;(await app.db.models.AccessToken.count({ where: { scope: 'password:reset' } })).should.equal(1)
            const token1 = await app.db.models.AccessToken.findOne({ where: { ownerId: TestObjects.alice.hashid } })
            token1.should.have.property('ownerId', TestObjects.alice.hashid)
            token1.should.have.property('ownerType', 'user')
            token1.should.have.property('scope', ['password:reset'])

            // Ensure regenerating the token removes old ones
            const newToken = await app.db.controllers.AccessToken.createTokenForPasswordReset(TestObjects.alice)
            // Should still only be one
            ;(await app.db.models.AccessToken.count({ where: { scope: 'password:reset' } })).should.equal(1)

            const oldTokenInDb = await app.db.controllers.AccessToken.getOrExpirePasswordResetToken(originalToken.token)
            should.not.exist(oldTokenInDb)

            const newTokenInDb = await app.db.controllers.AccessToken.getOrExpirePasswordResetToken(newToken.token)
            should.exist(newTokenInDb)
        })
    })
})
