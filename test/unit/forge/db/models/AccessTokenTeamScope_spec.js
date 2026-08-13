const should = require('should') // eslint-disable-line
const setup = require('../setup')

const FF_UTIL = require('flowforge-test-utils')
const { Permissions } = FF_UTIL.require('forge/lib/permissions')

describe('AccessTokenTeamScope model', function () {
    let app
    let TestObjects

    before(async function () {
        app = await setup()
        TestObjects = app.TestObjects
    })

    after(async function () {
        await app.close()
    })

    afterEach(async function () {
        await app.db.models.AccessTokenTeamScope.destroy({ where: {} })
        await app.db.models.AccessToken.destroy({ where: {} })
    })

    describe('New AccessToken columns', function () {
        it('defaults readOnly to false', async function () {
            const token = await app.db.models.AccessToken.create({
                token: 'test-token-readonly-default',
                scope: 'user',
                ownerId: '' + TestObjects.userAlice.id,
                ownerType: 'user',
                name: 'test-token'
            })
            token.should.have.property('readOnly', false)
        })

        it('defaults adminOptIn to false', async function () {
            const token = await app.db.models.AccessToken.create({
                token: 'test-token-admin-default',
                scope: 'user',
                ownerId: '' + TestObjects.userAlice.id,
                ownerType: 'user',
                name: 'test-token'
            })
            token.should.have.property('adminOptIn', false)
        })

        it('persists readOnly and adminOptIn values', async function () {
            const token = await app.db.models.AccessToken.create({
                token: 'test-token-persist',
                scope: 'user',
                ownerId: '' + TestObjects.userAlice.id,
                ownerType: 'user',
                name: 'test-token',
                readOnly: true,
                adminOptIn: true
            })
            token.should.have.property('readOnly', true)
            token.should.have.property('adminOptIn', true)

            const reloaded = await app.db.models.AccessToken.findOne({ where: { id: token.id } })
            reloaded.should.have.property('readOnly', true)
            reloaded.should.have.property('adminOptIn', true)
        })
    })

    describe('CRUD operations', function () {
        it('creates a scope entry linking a token, team, and user', async function () {
            const token = await app.db.models.AccessToken.create({
                token: 'test-scope-create',
                scope: 'user',
                ownerId: '' + TestObjects.userAlice.id,
                ownerType: 'user',
                name: 'test-token'
            })

            const scope = await app.db.models.AccessTokenTeamScope.create({
                AccessTokenId: token.id,
                TeamId: TestObjects.team1.id,
                UserId: TestObjects.userAlice.id
            })

            scope.should.have.property('AccessTokenId', token.id)
            scope.should.have.property('TeamId', TestObjects.team1.id)
            scope.should.have.property('UserId', TestObjects.userAlice.id)
        })

        it('reads scope entries for a token', async function () {
            const token = await app.db.models.AccessToken.create({
                token: 'test-scope-read',
                scope: 'user',
                ownerId: '' + TestObjects.userAlice.id,
                ownerType: 'user',
                name: 'test-token'
            })

            await app.db.models.AccessTokenTeamScope.create({
                AccessTokenId: token.id,
                TeamId: TestObjects.team1.id,
                UserId: TestObjects.userAlice.id
            })
            await app.db.models.AccessTokenTeamScope.create({
                AccessTokenId: token.id,
                TeamId: TestObjects.team3.id,
                UserId: TestObjects.userAlice.id
            })

            const scopes = await app.db.models.AccessTokenTeamScope.findAll({
                where: { AccessTokenId: token.id }
            })
            scopes.should.have.length(2)
        })

        it('deletes a scope entry', async function () {
            const token = await app.db.models.AccessToken.create({
                token: 'test-scope-delete',
                scope: 'user',
                ownerId: '' + TestObjects.userAlice.id,
                ownerType: 'user',
                name: 'test-token'
            })

            const scope = await app.db.models.AccessTokenTeamScope.create({
                AccessTokenId: token.id,
                TeamId: TestObjects.team1.id,
                UserId: TestObjects.userAlice.id
            })

            await scope.destroy()
            const remaining = await app.db.models.AccessTokenTeamScope.findAll({
                where: { AccessTokenId: token.id }
            })
            remaining.should.have.length(0)
        })

        it('enforces unique constraint on (AccessTokenId, TeamId)', async function () {
            const token = await app.db.models.AccessToken.create({
                token: 'test-scope-unique',
                scope: 'user',
                ownerId: '' + TestObjects.userAlice.id,
                ownerType: 'user',
                name: 'test-token'
            })

            await app.db.models.AccessTokenTeamScope.create({
                AccessTokenId: token.id,
                TeamId: TestObjects.team1.id,
                UserId: TestObjects.userAlice.id
            })

            try {
                await app.db.models.AccessTokenTeamScope.create({
                    AccessTokenId: token.id,
                    TeamId: TestObjects.team1.id,
                    UserId: TestObjects.userAlice.id
                })
                should.fail('Expected unique constraint error')
            } catch (err) {
                err.name.should.match(/SequelizeUniqueConstraintError/)
            }
        })
    })

    describe('CASCADE behavior', function () {
        it('deleting an AccessToken removes its scope entries', async function () {
            const token = await app.db.models.AccessToken.create({
                token: 'test-cascade-token',
                scope: 'user',
                ownerId: '' + TestObjects.userAlice.id,
                ownerType: 'user',
                name: 'test-token'
            })

            await app.db.models.AccessTokenTeamScope.create({
                AccessTokenId: token.id,
                TeamId: TestObjects.team1.id,
                UserId: TestObjects.userAlice.id
            })
            await app.db.models.AccessTokenTeamScope.create({
                AccessTokenId: token.id,
                TeamId: TestObjects.team3.id,
                UserId: TestObjects.userAlice.id
            })

            ;(await app.db.models.AccessTokenTeamScope.count({ where: { AccessTokenId: token.id } })).should.equal(2)

            await token.destroy()

            ;(await app.db.models.AccessTokenTeamScope.count({ where: { AccessTokenId: token.id } })).should.equal(0)
        })

        it('deleting a Team removes scope entries referencing it', async function () {
            // Create a temporary team to delete
            const tempTeam = await app.db.models.Team.create({
                name: 'TempTeamCascade',
                TeamTypeId: TestObjects.defaultTeamType.id
            })

            const token = await app.db.models.AccessToken.create({
                token: 'test-cascade-team',
                scope: 'user',
                ownerId: '' + TestObjects.userAlice.id,
                ownerType: 'user',
                name: 'test-token'
            })

            await app.db.models.AccessTokenTeamScope.create({
                AccessTokenId: token.id,
                TeamId: tempTeam.id,
                UserId: TestObjects.userAlice.id
            })

            ;(await app.db.models.AccessTokenTeamScope.count({ where: { TeamId: tempTeam.id } })).should.equal(1)

            await tempTeam.destroy()

            ;(await app.db.models.AccessTokenTeamScope.count({ where: { TeamId: tempTeam.id } })).should.equal(0)

            // Token itself should still exist
            const reloadedToken = await app.db.models.AccessToken.findOne({ where: { id: token.id } })
            should.exist(reloadedToken)
        })

        it('deleting a User removes scope entries referencing them', async function () {
            // Create a temporary user to delete
            const tempUser = await app.db.models.User.create({
                username: 'temp-cascade-user',
                name: 'Temp User',
                email: 'temp-cascade@example.com',
                password: 'ttPassword',
                email_verified: true
            })

            const token = await app.db.models.AccessToken.create({
                token: 'test-cascade-user',
                scope: 'user',
                ownerId: '' + tempUser.id,
                ownerType: 'user',
                name: 'test-token'
            })

            await app.db.models.AccessTokenTeamScope.create({
                AccessTokenId: token.id,
                TeamId: TestObjects.team1.id,
                UserId: tempUser.id
            })

            ;(await app.db.models.AccessTokenTeamScope.count({ where: { UserId: tempUser.id } })).should.equal(1)

            await tempUser.destroy()

            ;(await app.db.models.AccessTokenTeamScope.count({ where: { UserId: tempUser.id } })).should.equal(0)
        })
    })

    describe('getPersonalAccessTokens', function () {
        it('returns readOnly and adminOptIn fields', async function () {
            await app.db.controllers.AccessToken.createPersonalAccessToken(
                TestObjects.userAlice, ['user:read'], null, 'scoped-token-1'
            )

            const tokens = await app.db.models.AccessToken.getPersonalAccessTokens(TestObjects.userAlice)
            tokens.should.have.length(1)
            tokens[0].should.have.property('readOnly', false)
            tokens[0].should.have.property('adminOptIn', false)
        })

        it('returns eager-loaded team scopes', async function () {
            const result = await app.db.controllers.AccessToken.createPersonalAccessToken(
                TestObjects.userAlice, ['user:read'], null, 'scoped-token-2'
            )

            // Decode the hashid to get the real token id
            const tokenId = app.db.models.AccessToken.decodeHashid(result.id)
            const dbToken = await app.db.models.AccessToken.findOne({ where: { id: tokenId } })

            await app.db.models.AccessTokenTeamScope.create({
                AccessTokenId: dbToken.id,
                TeamId: TestObjects.team1.id,
                UserId: TestObjects.userAlice.id
            })

            const tokens = await app.db.models.AccessToken.getPersonalAccessTokens(TestObjects.userAlice)
            tokens.should.have.length(1)
            tokens[0].AccessTokenTeamScopes.should.have.length(1)
            tokens[0].AccessTokenTeamScopes[0].Team.should.have.property('name', 'ATeam')
        })

        it('returns empty team scopes array for unscoped tokens', async function () {
            await app.db.controllers.AccessToken.createPersonalAccessToken(
                TestObjects.userAlice, ['user:read'], null, 'unscoped-token'
            )

            const tokens = await app.db.models.AccessToken.getPersonalAccessTokens(TestObjects.userAlice)
            tokens.should.have.length(1)
            tokens[0].AccessTokenTeamScopes.should.have.length(0)
        })
    })

    describe('Permissions access tagging', function () {
        it('every permission has an access field set to read or write', function () {
            const keys = Object.keys(Permissions)
            keys.length.should.be.above(0)
            for (const key of keys) {
                Permissions[key].should.have.property('access')
                ;['read', 'write'].should.containEql(Permissions[key].access)
            }
        })
    })
})
