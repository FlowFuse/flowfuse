const should = require('should') // eslint-disable-line
const { sha256 } = require('../../../../../forge/db/utils')
const mcpToolPermissions = require('../../../../../forge/lib/mcpToolPermissions')
const setup = require('../setup')

describe('AccessToken controller', function () {
    // Use standard test data.
    let app
    /** @type {import('../../../../../forge/db/controllers/AccessToken') */
    let AccessTokenController
    /** @type {import('../../../../lib/TestModelFactory')} */
    let factory
    const TestObjects = {
        alice: null,
        team: null,
        project: null,
        application: null,
        device: null,
        stack: null,
        template: null,
        projectType: null
    }

    before(async function () {
        app = await setup()
        factory = app.factory
        AccessTokenController = app.db.controllers.AccessToken
        TestObjects.alice = await app.db.models.User.byUsername('alice')
        TestObjects.team = await app.db.models.Team.byName('ATeam')
        TestObjects.template = await factory.createProjectTemplate(
            { name: 'template1', settings: {}, policy: {} },
            TestObjects.alice
        )
        TestObjects.projectType = await factory.createProjectType({
            name: 'projectType1',
            description: 'default project type',
            properties: {
                billingProductId: 'product_123',
                billingPriceId: 'price_123'
            }
        })
        TestObjects.stack = await factory.createStack({ name: 'stack1' }, TestObjects.projectType)
        TestObjects.application = await factory.createApplication({ name: 'application-1' }, TestObjects.team)
        TestObjects.project = await factory.createInstance(
            { name: 'project' },
            TestObjects.application,
            TestObjects.stack,
            TestObjects.template,
            TestObjects.projectType,
            { start: false }
        )
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
            const result = await AccessTokenController.createTokenForTeamDeviceProvisioning('Provisioning Token 1', TestObjects.team, null, null, Date.now() + 5000)
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
            const result = await AccessTokenController.createTokenForTeamDeviceProvisioning('Provisioning Token 2', TestObjects.team, 'instance', TestObjects.project.id, Date.now() + 5000)
            ;(await app.db.models.AccessToken.count()).should.equal(1)
            result.should.have.property('token')

            const token = await AccessTokenController.getOrExpire(result.token)
            should.exist(token)
            token.should.have.property('scope', ['device:provision', 'name:Provisioning Token 2', 'project:' + TestObjects.project.id])
            token.should.have.property('ownerId', '' + TestObjects.team.id)
            token.should.have.property('ownerType', 'team')
            token.should.have.property('id') // AccessToken table now has an id column
        })

        it('creates a provisioning token for a teams application', async function () {
            ;(await app.db.models.AccessToken.count()).should.equal(0)
            const result = await AccessTokenController.createTokenForTeamDeviceProvisioning('Provisioning Token 3', TestObjects.team, 'application', TestObjects.application.hashid, Date.now() + 5000)
            ;(await app.db.models.AccessToken.count()).should.equal(1)
            result.should.have.property('token')

            const token = await AccessTokenController.getOrExpire(result.token)
            should.exist(token)
            token.should.have.property('scope', ['device:provision', 'name:Provisioning Token 3', 'application:' + TestObjects.application.hashid])
            token.should.have.property('ownerId', '' + TestObjects.team.id)
            token.should.have.property('ownerType', 'team')
            token.should.have.property('id') // AccessToken table now has an id column
        })

        it('edits a provisioning token to set the project', async function () {
            ;(await app.db.models.AccessToken.count()).should.equal(0)
            const result = await AccessTokenController.createTokenForTeamDeviceProvisioning('Provisioning Token', TestObjects.team, null, null, Date.now() + 5000)
            ;(await app.db.models.AccessToken.count()).should.equal(1)
            result.should.have.property('token')

            const token = await AccessTokenController.getOrExpire(result.token)
            should.exist(token)
            token.should.have.property('scope', ['device:provision', 'name:Provisioning Token'])

            await AccessTokenController.updateTokenForTeamDeviceProvisioning(token, 'instance', TestObjects.project.id) // update the token to have a project
            ;(await app.db.models.AccessToken.count()).should.equal(1) // should still have only 1 token
            const editedToken = await AccessTokenController.getOrExpire(result.token)
            should.exist(editedToken)
            editedToken.should.have.property('scope', ['device:provision', 'name:Provisioning Token', 'project:' + TestObjects.project.id])
        })

        it('edits a provisioning token to set the application', async function () {
            ;(await app.db.models.AccessToken.count()).should.equal(0)
            const result = await AccessTokenController.createTokenForTeamDeviceProvisioning('Provisioning Token', TestObjects.team, null, null, Date.now() + 5000)
            ;(await app.db.models.AccessToken.count()).should.equal(1)
            result.should.have.property('token')

            const token = await AccessTokenController.getOrExpire(result.token)
            should.exist(token)
            token.should.have.property('scope', ['device:provision', 'name:Provisioning Token'])

            await AccessTokenController.updateTokenForTeamDeviceProvisioning(token, 'application', TestObjects.application.hashid) // update the token to have a application
            ;(await app.db.models.AccessToken.count()).should.equal(1) // should still have only 1 token
            const editedToken = await AccessTokenController.getOrExpire(result.token)
            should.exist(editedToken)
            editedToken.should.have.property('scope', ['device:provision', 'name:Provisioning Token', 'application:' + TestObjects.application.hashid])
        })

        it('edits a provisioning token to remove the application', async function () {
            ;(await app.db.models.AccessToken.count()).should.equal(0)
            const result = await AccessTokenController.createTokenForTeamDeviceProvisioning('Provisioning Token', TestObjects.team, 'application', TestObjects.application.hashid, Date.now() + 5000)
            ;(await app.db.models.AccessToken.count()).should.equal(1)
            result.should.have.property('token')

            const token = await AccessTokenController.getOrExpire(result.token)
            should.exist(token)
            token.should.have.property('scope', ['device:provision', 'name:Provisioning Token', 'application:' + TestObjects.application.hashid])

            await AccessTokenController.updateTokenForTeamDeviceProvisioning(token, null, null) // update the token to have a project
            ;(await app.db.models.AccessToken.count()).should.equal(1) // should still have only 1 token
            const editedToken = await AccessTokenController.getOrExpire(result.token)
            should.exist(editedToken)
            editedToken.should.have.property('scope', ['device:provision', 'name:Provisioning Token'])
        })

        it('edits a provisioning token to remove the project', async function () {
            ;(await app.db.models.AccessToken.count()).should.equal(0)
            const result = await AccessTokenController.createTokenForTeamDeviceProvisioning('Provisioning Token', TestObjects.team, 'instance', TestObjects.project.id, Date.now() + 5000)
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

    describe('MCP OAuth Tokens', function () {
        function createToken ({ readOnly = false, ...opts } = {}) {
            return app.db.controllers.AccessToken.createMCPOAuthToken(TestObjects.alice.id, {
                toolPermissions: mcpToolPermissions.fromReadOnly(readOnly),
                ...opts
            })
        }

        // Move the row's token expiries so refresh behaviour can be exercised at once.
        async function setRowExpiry (refreshToken, { accessMs, refreshMs } = {}) {
            const row = await app.db.models.AccessToken.byRefreshToken(refreshToken)
            const updates = {}
            if (accessMs !== undefined) {
                updates.expiresAt = new Date(Date.now() + accessMs)
            }
            if (refreshMs !== undefined) {
                updates.refreshTokenExpiresAt = new Date(Date.now() + refreshMs)
            }
            await app.db.models.AccessToken.update(updates, { where: { id: row.id } })
        }

        // Move when a rotated-out token was retired, to exercise the grace window.
        async function ageRotation (rotatedRefreshToken, ms) {
            await app.db.models.AccessTokenRefreshRotation.update(
                { rotatedAt: new Date(Date.now() + ms) },
                { where: { tokenHash: sha256(rotatedRefreshToken) } }
            )
        }

        it('creates a user token with a refresh token that outlives the access token', async function () {
            const result = await createToken({ readOnly: true })
            result.token.should.be.a.String().and.startWith('ffpat')
            result.refreshToken.should.be.a.String().and.startWith('ffpat')
            should.exist(result.expiresAt)

            const row = await app.db.models.AccessToken.byRefreshToken(result.refreshToken)
            row.should.have.property('readOnly', true)
            should.exist(row.refreshTokenExpiresAt)
            row.refreshTokenExpiresAt.getTime().should.be.greaterThan(row.expiresAt.getTime())
        })

        describe('grant', function () {
            const readPlatform = { platform: { read: true, write: false, destructive: false }, flow_building: { read: false, write: false, destructive: false } }

            async function loadGrant (refreshToken) {
                const row = await app.db.models.AccessToken.byRefreshToken(refreshToken)
                return app.db.models.MCPGrant.findOne({
                    where: { AccessTokenId: row.id },
                    include: [{ model: app.db.models.MCPGrantTeamPermission }]
                })
            }

            it('stores the default permissions as given on a grant', async function () {
                const result = await createToken({ toolPermissions: { default: readPlatform, teams: {} } })
                const grant = await loadGrant(result.refreshToken)
                grant.permissions.should.eql(readPlatform)
                grant.MCPGrantTeamPermissions.should.have.length(0)
            })

            it('does not add a toolPermissions column to the token', async function () {
                const result = await createToken()
                const row = await app.db.models.AccessToken.byRefreshToken(result.refreshToken)
                row.should.not.have.property('toolPermissions')
            })

            it('derives readOnly true when nothing in the default or any override allows write', async function () {
                const result = await createToken({
                    toolPermissions: {
                        default: readPlatform,
                        teams: { [TestObjects.team.hashid]: { platform: { read: true, write: false, destructive: false }, flow_building: { read: true, write: false, destructive: false } } }
                    }
                })
                const row = await app.db.models.AccessToken.byRefreshToken(result.refreshToken)
                row.should.have.property('readOnly', true)
            })

            it('derives readOnly false when only a team override allows write', async function () {
                const result = await createToken({
                    toolPermissions: {
                        default: readPlatform,
                        teams: { [TestObjects.team.hashid]: { platform: { read: true, write: true, destructive: false }, flow_building: { read: true, write: false, destructive: false } } }
                    }
                })
                const row = await app.db.models.AccessToken.byRefreshToken(result.refreshToken)
                row.should.have.property('readOnly', false)
            })

            it('persists team rows against the grant', async function () {
                const teamPermissions = { platform: { read: true, write: true, destructive: true }, flow_building: { read: true, write: true, destructive: true } }
                const result = await createToken({
                    toolPermissions: { default: readPlatform, teams: { [TestObjects.team.hashid]: teamPermissions } }
                })
                const grant = await loadGrant(result.refreshToken)
                grant.MCPGrantTeamPermissions.should.have.length(1)
                grant.MCPGrantTeamPermissions[0].should.have.property('TeamId', TestObjects.team.id)
                grant.MCPGrantTeamPermissions[0].permissions.should.eql(teamPermissions)
            })

            it('keeps the grant when the token is refreshed', async function () {
                const result = await createToken({ toolPermissions: mcpToolPermissions.fromReadOnly(true) })
                const before = await loadGrant(result.refreshToken)
                const refreshed = await app.db.controllers.AccessToken.refreshToken(result.refreshToken)
                const after = await loadGrant(refreshed.refreshToken)
                after.should.have.property('id', before.id)
            })

            it('removes the grant and its team rows when the token is destroyed', async function () {
                const result = await createToken({
                    toolPermissions: { default: readPlatform, teams: { [TestObjects.team.hashid]: readPlatform } }
                })
                const row = await app.db.models.AccessToken.byRefreshToken(result.refreshToken)
                await row.destroy()
                ;(await app.db.models.MCPGrant.count()).should.equal(0)
                ;(await app.db.models.MCPGrantTeamPermission.count()).should.equal(0)
            })

            describe('team scope edits', function () {
                let otherTeam

                before(async function () {
                    otherTeam = await factory.createTeam({ name: 'grant-scope-other' })
                })

                async function tokenWithBothTeams () {
                    const result = await createToken({
                        teamIds: [TestObjects.team.hashid, otherTeam.hashid],
                        toolPermissions: {
                            default: readPlatform,
                            teams: { [TestObjects.team.hashid]: readPlatform, [otherTeam.hashid]: readPlatform }
                        }
                    })
                    return app.db.models.AccessToken.byRefreshToken(result.refreshToken)
                }

                it('removes team rows for teams dropped from the scopes', async function () {
                    const row = await tokenWithBothTeams()
                    await AccessTokenController.updatePersonalAccessToken(TestObjects.alice, row.id, 'ff', null, { teamIds: [TestObjects.team.hashid] })
                    const grant = await app.db.models.MCPGrant.findOne({ where: { AccessTokenId: row.id }, include: [{ model: app.db.models.MCPGrantTeamPermission }] })
                    grant.MCPGrantTeamPermissions.map(r => r.TeamId).should.eql([TestObjects.team.id])
                })

                it('reports readOnly from the grant once the only override allowing write is removed', async function () {
                    const writePlatform = { platform: { read: true, write: true, destructive: false }, flow_building: { read: false, write: false, destructive: false } }
                    const result = await createToken({
                        teamIds: [TestObjects.team.hashid, otherTeam.hashid],
                        toolPermissions: { default: readPlatform, teams: { [otherTeam.hashid]: writePlatform } }
                    })
                    const row = await app.db.models.AccessToken.byRefreshToken(result.refreshToken)
                    const reloadWithGrant = () => app.db.models.AccessToken.findOne({
                        where: { id: row.id },
                        include: [{ model: app.db.models.MCPGrant, include: [{ model: app.db.models.MCPGrantTeamPermission }] }]
                    })
                    mcpToolPermissions.effectiveReadOnly(await reloadWithGrant(), app.db.models.Team.encodeHashid).should.be.false()
                    await AccessTokenController.updatePersonalAccessToken(TestObjects.alice, row.id, 'ff', null, { teamIds: [TestObjects.team.hashid] })
                    mcpToolPermissions.effectiveReadOnly(await reloadWithGrant(), app.db.models.Team.encodeHashid).should.be.true()
                })

                it('ignores a readOnly value for a token with a grant', async function () {
                    const row = await tokenWithBothTeams()
                    const updated = await AccessTokenController.updatePersonalAccessToken(TestObjects.alice, row.id, 'ff', null, { readOnly: false })
                    mcpToolPermissions.effectiveReadOnly(updated, app.db.models.Team.encodeHashid).should.be.true()
                })

                it('returns the grant with the updated token', async function () {
                    const row = await tokenWithBothTeams()
                    const updated = await AccessTokenController.updatePersonalAccessToken(TestObjects.alice, row.id, 'ff', null, { teamIds: [TestObjects.team.hashid] })
                    const summary = app.db.views.AccessToken.personalAccessTokenSummary(updated)
                    summary.toolPermissions.should.eql({ default: readPlatform, teams: { [TestObjects.team.hashid]: readPlatform } })
                })

                it('keeps team rows when the scopes become unrestricted', async function () {
                    const row = await tokenWithBothTeams()
                    await AccessTokenController.updatePersonalAccessToken(TestObjects.alice, row.id, 'ff', null, { teamIds: [] })
                    const grant = await app.db.models.MCPGrant.findOne({ where: { AccessTokenId: row.id }, include: [{ model: app.db.models.MCPGrantTeamPermission }] })
                    grant.MCPGrantTeamPermissions.should.have.length(2)
                })
            })
        })

        it('rejects an expired access token but keeps the row so it can still be refreshed', async function () {
            const original = await createToken()
            await setRowExpiry(original.refreshToken, { accessMs: -5000 })

            // The access token is rejected...
            should.not.exist(await app.db.controllers.AccessToken.getOrExpire(original.token))
            // ...but the row survives (RFC 6749 §1.5) so refresh still works.
            ;(await app.db.models.AccessToken.count()).should.equal(1)

            const refreshed = await app.db.controllers.AccessToken.refreshToken(original.refreshToken)
            should.exist(refreshed)
            should.exist(await app.db.controllers.AccessToken.getOrExpire(refreshed.token))
        })

        it('destroys the row once the refresh token has also expired', async function () {
            const original = await createToken()
            await setRowExpiry(original.refreshToken, { accessMs: -5000, refreshMs: -1000 })

            should.not.exist(await app.db.controllers.AccessToken.getOrExpire(original.token))
            ;(await app.db.models.AccessToken.count()).should.equal(0)
        })

        it('rotates the refresh token and slides its expiry on refresh', async function () {
            const original = await createToken()
            // Bring the refresh expiry close so the slide back out to the full
            // lifetime is observable rather than a same-millisecond tie.
            await setRowExpiry(original.refreshToken, { accessMs: -5000, refreshMs: 60000 })
            const before = await app.db.models.AccessToken.byRefreshToken(original.refreshToken)

            const refreshed = await app.db.controllers.AccessToken.refreshToken(original.refreshToken)
            refreshed.token.should.not.equal(original.token)
            // The refresh token is rotated, and the new access token authenticates.
            refreshed.refreshToken.should.be.a.String().and.not.equal(original.refreshToken)
            should.exist(await app.db.controllers.AccessToken.getOrExpire(refreshed.token))

            const after = await app.db.models.AccessToken.byRefreshToken(refreshed.refreshToken)
            after.refreshTokenExpiresAt.getTime().should.be.greaterThan(before.refreshTokenExpiresAt.getTime())
        })

        it('re-mints an access token for a retried refresh within the grace window', async function () {
            const original = await createToken()
            await setRowExpiry(original.refreshToken, { accessMs: -5000 })

            await app.db.controllers.AccessToken.refreshToken(original.refreshToken)
            // The rotated-out token, presented again within grace, re-mints an access token only.
            const retry = await app.db.controllers.AccessToken.refreshToken(original.refreshToken)
            should.exist(retry)
            should.exist(await app.db.controllers.AccessToken.getOrExpire(retry.token))
            should.not.exist(retry.refreshToken)
            ;(await app.db.models.AccessToken.count()).should.equal(1)
        })

        it('fails to refresh once the refresh token lifetime has passed', async function () {
            const original = await createToken()
            await setRowExpiry(original.refreshToken, { refreshMs: -1000 })

            should.not.exist(await app.db.controllers.AccessToken.refreshToken(original.refreshToken))
            ;(await app.db.models.AccessToken.count()).should.equal(0)
        })

        it('revokes the grant when a rotated-out token is replayed after the grace window', async function () {
            const original = await createToken()
            await setRowExpiry(original.refreshToken, { accessMs: -5000 })
            const first = await app.db.controllers.AccessToken.refreshToken(original.refreshToken)

            // Age the retired token beyond the grace window, then present it again.
            await ageRotation(original.refreshToken, -120000)
            const replay = await app.db.controllers.AccessToken.refreshToken(original.refreshToken)
            replay.should.have.property('replay', true)
            ;(await app.db.models.AccessToken.count()).should.equal(0)
            should.not.exist(await app.db.controllers.AccessToken.getOrExpire(first.token))
        })

        it('detects a replay of a token retired several rotations earlier', async function () {
            const original = await createToken()
            await setRowExpiry(original.refreshToken, { accessMs: -5000 })
            // Rotate twice, leaving the original two rotations back.
            const first = await app.db.controllers.AccessToken.refreshToken(original.refreshToken)
            await app.db.controllers.AccessToken.refreshToken(first.refreshToken)

            // The full lineage still catches the original as a replay past grace.
            await ageRotation(original.refreshToken, -120000)
            const replay = await app.db.controllers.AccessToken.refreshToken(original.refreshToken)
            replay.should.have.property('replay', true)
            ;(await app.db.models.AccessToken.count()).should.equal(0)
        })

        it('returns null for an unknown refresh token', async function () {
            should.not.exist(await app.db.controllers.AccessToken.refreshToken('ffpat_unknown'))
        })

        it('lets only one of two simultaneous refreshes rotate the token', async function () {
            const original = await createToken()
            await setRowExpiry(original.refreshToken, { accessMs: -5000 })

            const [a, b] = await Promise.all([
                app.db.controllers.AccessToken.refreshToken(original.refreshToken),
                app.db.controllers.AccessToken.refreshToken(original.refreshToken)
            ])

            // Both callers succeed (no false null or replay) and the grant is intact.
            should.exist(a)
            should.exist(b)
            a.should.not.have.property('replay')
            b.should.not.have.property('replay')
            ;(await app.db.models.AccessToken.count()).should.equal(1)
            // Only one rotated the refresh token; the lagging one re-minted access only.
            const rotations = [a, b].filter(result => result.refreshToken)
            rotations.length.should.equal(1)
            const live = []
            for (const result of [a, b]) {
                if (await app.db.controllers.AccessToken.getOrExpire(result.token)) {
                    live.push(result)
                }
            }
            // Only one token survives: the grace re-mint overwrites the single token column,
            // so the loser can leave the winner's access token dead. Accepted limitation for
            // single-client MCP (see refreshToken grace branch), hence aboveOrEqual not equal.
            live.length.should.be.aboveOrEqual(1)
        })

        describe('with a grant expiry', function () {
            const DAY = 24 * 60 * 60 * 1000

            it('stores the grant expiry and caps the refresh window at it', async function () {
                const grantExpiresAt = Date.now() + 10 * DAY
                const result = await createToken({ grantExpiresAt })

                const row = await app.db.models.AccessToken.byRefreshToken(result.refreshToken)
                row.grantExpiresAt.getTime().should.equal(grantExpiresAt)
                // 10 days is inside the 30 day window, so the cap applies
                row.refreshTokenExpiresAt.getTime().should.equal(grantExpiresAt)
            })

            it('keeps the default refresh window when the grant expiry is further out', async function () {
                const grantExpiresAt = Date.now() + 365 * DAY
                const result = await createToken({ grantExpiresAt })

                const row = await app.db.models.AccessToken.byRefreshToken(result.refreshToken)
                row.refreshTokenExpiresAt.getTime().should.be.approximately(Date.now() + 30 * DAY, 5000)
            })

            it('cannot slide the refresh window past the grant expiry', async function () {
                const grantExpiresAt = Date.now() + 1 * DAY
                const original = await createToken({ grantExpiresAt })
                await setRowExpiry(original.refreshToken, { accessMs: -5000 })

                const refreshed = await app.db.controllers.AccessToken.refreshToken(original.refreshToken)
                should.exist(refreshed)
                // Refresh rotates the token, so the row is now found via the new one.
                const after = await app.db.models.AccessToken.byRefreshToken(refreshed.refreshToken)
                after.refreshTokenExpiresAt.getTime().should.be.belowOrEqual(grantExpiresAt)
            })

            it('cannot mint an access token that outlives the grant expiry', async function () {
                const grantExpiresAt = Date.now() + 10 * 60 * 1000
                const original = await createToken({ grantExpiresAt })
                await setRowExpiry(original.refreshToken, { accessMs: -5000 })

                const refreshed = await app.db.controllers.AccessToken.refreshToken(original.refreshToken)
                should.exist(refreshed)
                refreshed.expiresAt.should.be.belowOrEqual(grantExpiresAt)
            })
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
