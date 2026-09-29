const should = require('should') // eslint-disable-line
const setup = require('../setup')

describe('AccessTokenToolPermission model', function () {
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
        await app.db.models.AccessTokenToolPermission.destroy({ where: {} })
        await app.db.models.AccessToken.destroy({ where: {} })
    })

    const samplePermissions = {
        platform: { read: true, write: true, destructive: false },
        flow_building: { read: true, write: false, destructive: false }
    }

    async function createToken (tokenValue) {
        return app.db.models.AccessToken.create({
            token: tokenValue,
            scope: 'user',
            ownerId: '' + TestObjects.userAlice.id,
            ownerType: 'user',
            name: 'test-token'
        })
    }

    describe('CRUD operations', function () {
        it('creates and reads back a JSON permissions row', async function () {
            const token = await createToken('test-tool-permissions-create')

            const row = await app.db.models.AccessTokenToolPermission.create({
                AccessTokenId: token.id,
                TeamId: TestObjects.team1.id,
                permissions: samplePermissions
            })
            row.should.have.property('AccessTokenId', token.id)
            row.should.have.property('TeamId', TestObjects.team1.id)
            row.permissions.should.eql(samplePermissions)

            const reloaded = await app.db.models.AccessTokenToolPermission.findOne({ where: { id: row.id } })
            reloaded.permissions.should.eql(samplePermissions)
        })

        it('deletes a permissions row', async function () {
            const token = await createToken('test-tool-permissions-delete')
            const row = await app.db.models.AccessTokenToolPermission.create({
                AccessTokenId: token.id,
                TeamId: TestObjects.team1.id,
                permissions: samplePermissions
            })

            await row.destroy()
            const remaining = await app.db.models.AccessTokenToolPermission.findAll({ where: { AccessTokenId: token.id } })
            remaining.should.have.length(0)
        })

        it('enforces unique constraint on (AccessTokenId, TeamId, ApplicationId)', async function () {
            const application = await app.factory.createApplication({ name: 'tool-permissions-unique-app' }, TestObjects.team1)
            const token = await createToken('test-tool-permissions-unique')
            await app.db.models.AccessTokenToolPermission.create({
                AccessTokenId: token.id,
                TeamId: TestObjects.team1.id,
                ApplicationId: application.id,
                permissions: samplePermissions
            })

            try {
                await app.db.models.AccessTokenToolPermission.create({
                    AccessTokenId: token.id,
                    TeamId: TestObjects.team1.id,
                    ApplicationId: application.id,
                    permissions: samplePermissions
                })
                should.fail('Expected unique constraint error')
            } catch (err) {
                err.name.should.match(/SequelizeUniqueConstraintError/)
            }
        })
    })

    describe('CASCADE behavior', function () {
        it('deleting an AccessToken removes its permissions rows', async function () {
            const token = await createToken('test-tool-permissions-cascade-token')
            await app.db.models.AccessTokenToolPermission.create({
                AccessTokenId: token.id,
                TeamId: TestObjects.team1.id,
                permissions: samplePermissions
            })

            ;(await app.db.models.AccessTokenToolPermission.count({ where: { AccessTokenId: token.id } })).should.equal(1)

            await token.destroy()

            ;(await app.db.models.AccessTokenToolPermission.count({ where: { AccessTokenId: token.id } })).should.equal(0)
        })

        it('deleting a Team removes permissions rows referencing it', async function () {
            const tempTeam = await app.db.models.Team.create({
                name: 'TempTeamToolPermissionsCascade',
                TeamTypeId: TestObjects.defaultTeamType.id
            })
            const token = await createToken('test-tool-permissions-cascade-team')
            await app.db.models.AccessTokenToolPermission.create({
                AccessTokenId: token.id,
                TeamId: tempTeam.id,
                permissions: samplePermissions
            })

            ;(await app.db.models.AccessTokenToolPermission.count({ where: { TeamId: tempTeam.id } })).should.equal(1)

            await tempTeam.destroy()

            ;(await app.db.models.AccessTokenToolPermission.count({ where: { TeamId: tempTeam.id } })).should.equal(0)

            const reloadedToken = await app.db.models.AccessToken.findOne({ where: { id: token.id } })
            should.exist(reloadedToken)
        })
    })
})
