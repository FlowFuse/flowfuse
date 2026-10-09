const should = require('should') // eslint-disable-line

const setup = require('../../setup')

describe('Git tokens audit log', function () {
    let app
    let sid
    let alice

    before(async function () {
        app = await setup()
        const defaultTeamTypeProperties = app.defaultTeamType.properties
        defaultTeamTypeProperties.features.gitIntegration = true
        app.defaultTeamType.properties = defaultTeamTypeProperties
        await app.defaultTeamType.save()

        alice = await app.db.models.User.byUsername('alice')
        const login = await app.inject({
            method: 'POST',
            url: '/account/login',
            payload: { username: 'alice', password: 'aaPassword', remember: false }
        })
        sid = login.cookies[0].value
    })

    after(async function () {
        await app.close()
    })

    beforeEach(async function () {
        await app.db.models.AuditLog.destroy({ where: {} })
    })

    async function request (method, path, payload) {
        return app.inject({
            method,
            url: `/api/v1/teams/${app.team.hashid}/git/tokens${path}`,
            payload,
            cookies: { sid }
        })
    }

    async function auditEntries (event) {
        const logs = await app.db.models.AuditLog.findAll({ where: { event } })
        return logs.map(log => ({ UserId: log.UserId, body: JSON.parse(log.body) }))
    }

    it('logs token creation without the token value', async function () {
        const response = await request('POST', '', { name: 'my token', token: 'super-secret-value', type: 'github' })
        response.statusCode.should.equal(200)
        const entries = await auditEntries('team.git.token.created')
        entries.should.have.length(1)
        entries[0].UserId.should.equal(alice.id)
        entries[0].body.should.have.property('team')
        entries[0].body.gitToken.should.only.have.keys('id', 'name', 'type')
        entries[0].body.gitToken.should.have.property('name', 'my token')
        entries[0].body.gitToken.should.have.property('id', response.json().id)
        JSON.stringify(entries[0].body).should.not.containEql('super-secret-value')
    })

    it('logs token rename with the name change', async function () {
        const created = (await request('POST', '', { name: 'before', token: 'abc' })).json()
        const response = await request('PUT', `/${created.id}`, { name: 'after' })
        response.statusCode.should.equal(200)
        const entries = await auditEntries('team.git.token.updated')
        entries.should.have.length(1)
        entries[0].UserId.should.equal(alice.id)
        entries[0].body.gitToken.should.have.property('name', 'after')
        entries[0].body.should.have.property('updates').and.be.an.Array()
        entries[0].body.updates[0].should.have.property('key', 'name')
        entries[0].body.updates[0].should.have.property('old', 'before')
        entries[0].body.updates[0].should.have.property('new', 'after')
    })

    it('does not log an update when the name is unchanged', async function () {
        const created = (await request('POST', '', { name: 'same', token: 'abc' })).json()
        await request('PUT', `/${created.id}`, { name: 'same' })
        const entries = await auditEntries('team.git.token.updated')
        entries.should.have.length(0)
    })

    it('logs token deletion', async function () {
        const created = (await request('POST', '', { name: 'to delete', token: 'abc' })).json()
        const response = await request('DELETE', `/${created.id}`)
        response.statusCode.should.equal(200)
        const entries = await auditEntries('team.git.token.deleted')
        entries.should.have.length(1)
        entries[0].body.gitToken.should.have.property('name', 'to delete')
    })

    it('does not log a repeated deletion', async function () {
        const created = (await request('POST', '', { name: 'twice', token: 'abc' })).json()
        await request('DELETE', `/${created.id}`)
        await app.db.models.AuditLog.destroy({ where: {} })
        const response = await request('DELETE', `/${created.id}`)
        response.statusCode.should.equal(404)
        const entries = await auditEntries('team.git.token.deleted')
        entries.should.have.length(0)
    })
})
