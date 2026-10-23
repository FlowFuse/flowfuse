const should = require('should') // eslint-disable-line

const setup = require('../setup')

describe('MCPGrant model', function () {
    let app
    let user
    let team
    let otherTeam
    let counter = 0

    const permissions = {
        platform: { read: true, write: false, destructive: false },
        flow_building: { read: true, write: false, destructive: false }
    }

    before(async function () {
        app = await setup()
        user = await app.factory.createUser({ username: 'grantuser', name: 'Grant User', email: 'grant@example.com', password: 'ggPassword' })
        team = await app.factory.createTeam({ name: 'grant-team' })
        otherTeam = await app.factory.createTeam({ name: 'grant-other-team' })
    })

    after(async function () {
        await app.close()
    })

    async function createToken () {
        counter++
        return app.db.models.AccessToken.create({
            name: 'MCP Agent',
            token: `token-${counter}`,
            scope: 'ff',
            ownerId: '' + user.id,
            ownerType: 'user'
        })
    }

    it('round-trips permissions as JSON', async function () {
        const token = await createToken()
        const grant = await app.db.models.MCPGrant.create({ AccessTokenId: token.id, permissions })
        const loaded = await app.db.models.MCPGrant.findOne({ where: { id: grant.id } })
        loaded.permissions.should.eql(permissions)
        const raw = await app.db.sequelize.query('SELECT "permissions" FROM "MCPGrants" WHERE "id" = ' + grant.id, { type: app.db.sequelize.QueryTypes.SELECT })
        raw[0].permissions.should.be.a.String()
    })

    it('allows one grant per token', async function () {
        const token = await createToken()
        await app.db.models.MCPGrant.create({ AccessTokenId: token.id, permissions })
        await app.db.models.MCPGrant.create({ AccessTokenId: token.id, permissions }).should.be.rejected()
    })

    it('is reachable from the token', async function () {
        const token = await createToken()
        await app.db.models.MCPGrant.create({ AccessTokenId: token.id, permissions })
        const loaded = await app.db.models.AccessToken.findOne({ where: { id: token.id }, include: [{ model: app.db.models.MCPGrant }] })
        loaded.MCPGrant.permissions.should.eql(permissions)
    })

    it('allows one row per team on a grant', async function () {
        const token = await createToken()
        const grant = await app.db.models.MCPGrant.create({ AccessTokenId: token.id, permissions })
        await app.db.models.MCPGrantTeamPermission.create({ MCPGrantId: grant.id, TeamId: team.id, permissions })
        await app.db.models.MCPGrantTeamPermission.create({ MCPGrantId: grant.id, TeamId: otherTeam.id, permissions })
        await app.db.models.MCPGrantTeamPermission.create({ MCPGrantId: grant.id, TeamId: team.id, permissions }).should.be.rejected()
    })

    it('removes the grant and team rows when the token is deleted', async function () {
        const token = await createToken()
        const grant = await app.db.models.MCPGrant.create({ AccessTokenId: token.id, permissions })
        await app.db.models.MCPGrantTeamPermission.create({ MCPGrantId: grant.id, TeamId: team.id, permissions })
        await token.destroy()
        should.not.exist(await app.db.models.MCPGrant.findOne({ where: { id: grant.id } }))
        ;(await app.db.models.MCPGrantTeamPermission.count({ where: { MCPGrantId: grant.id } })).should.equal(0)
    })

    it('removes team rows when the team is deleted', async function () {
        const token = await createToken()
        const grant = await app.db.models.MCPGrant.create({ AccessTokenId: token.id, permissions })
        await app.db.models.MCPGrantTeamPermission.create({ MCPGrantId: grant.id, TeamId: otherTeam.id, permissions })
        await app.db.sequelize.query('DELETE FROM "Teams" WHERE "id" = ' + otherTeam.id)
        ;(await app.db.models.MCPGrantTeamPermission.count({ where: { MCPGrantId: grant.id } })).should.equal(0)
    })
})
