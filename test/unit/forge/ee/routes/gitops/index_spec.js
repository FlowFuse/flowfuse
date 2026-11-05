const should = require('should') // eslint-disable-line

const setup = require('../../setup')

describe('Git tokens API', function () {
    let app
    let aliceSid
    let enabledTeam
    let disabledTeam

    before(async function () {
        app = await setup()

        const login = await app.inject({
            method: 'POST',
            url: '/account/login',
            payload: { username: 'alice', password: 'aaPassword', remember: false }
        })
        aliceSid = login.cookies[0].value

        const enabledType = await app.factory.createTeamType({
            name: 'git-enabled-type',
            properties: { features: { gitIntegration: true } }
        })
        const disabledType = await app.factory.createTeamType({
            name: 'git-disabled-type',
            properties: { features: { gitIntegration: false } }
        })
        const alice = await app.db.models.User.byUsername('alice')
        enabledTeam = await app.factory.createTeam({ name: 'GitEnabledTeam', TeamTypeId: enabledType.id })
        await enabledTeam.addUser(alice, { through: { role: app.factory.Roles.Roles.Owner } })
        disabledTeam = await app.factory.createTeam({ name: 'GitDisabledTeam', TeamTypeId: disabledType.id })
        await disabledTeam.addUser(alice, { through: { role: app.factory.Roles.Roles.Owner } })
    })

    after(async function () {
        await app.close()
    })

    function request (method, teamId, payload) {
        return app.inject({
            method,
            url: `/api/v1/teams/${teamId}/git/tokens`,
            payload,
            cookies: { sid: aliceSid }
        })
    }

    it('lists tokens when the feature is enabled for the team', async function () {
        const response = await request('GET', enabledTeam.hashid)
        response.statusCode.should.equal(200)
    })

    it('names the disabled feature in the 404 when git integration is not enabled', async function () {
        const list = await request('GET', disabledTeam.hashid)
        list.statusCode.should.equal(404)
        list.json().should.have.property('code', 'not_found')
        list.json().should.have.property('error', 'Not Found - Git integration is not enabled for this team')

        const create = await request('POST', disabledTeam.hashid, { name: 'tok', token: 'abc' })
        create.statusCode.should.equal(404)
        create.json().should.have.property('error', 'Not Found - Git integration is not enabled for this team')
    })

    it('returns the generic 404 for an unknown team', async function () {
        const response = await request('GET', 'unknown-team')
        response.statusCode.should.equal(404)
        response.json().should.have.property('error', 'Not Found')
    })
})

describe('Git Tokens API update and delete', function () {
    let app
    let cookie
    let token
    let tokenUrl

    before(async function () {
        setup.setupStripe()
        app = await setup()
        const teamTypeProperties = app.defaultTeamType.properties
        teamTypeProperties.features.gitIntegration = true
        app.defaultTeamType.properties = teamTypeProperties
        await app.defaultTeamType.save()

        const response = await app.inject({
            method: 'POST',
            url: '/account/login',
            payload: { username: 'alice', password: 'aaPassword', remember: false }
        })
        cookie = response.cookies[0].value

        token = await app.db.models.GitToken.create({
            name: 'original',
            token: 'secret-token',
            type: 'github',
            TeamId: app.team.id
        })
        tokenUrl = `/api/v1/teams/${app.team.hashid}/git/tokens/${token.hashid}`
    })

    after(async function () {
        await app.close()
        setup.resetStripe()
    })

    function put (url, payload) {
        return app.inject({ method: 'PUT', url, payload, cookies: { sid: cookie } })
    }

    describe('PUT /tokens/:tokenId', function () {
        it('renames the token', async function () {
            const response = await put(tokenUrl, { name: 'renamed' })
            response.statusCode.should.equal(200)
            response.json().should.have.property('name', 'renamed')
            await token.reload()
            token.name.should.equal('renamed')
        })

        it('returns 404 for an undecodable token id', async function () {
            const response = await put(`/api/v1/teams/${app.team.hashid}/git/tokens/not-a-hashid!!`, { name: 'a' })
            response.statusCode.should.equal(404)
            response.json().should.have.property('code', 'not_found')
        })

        it('returns 400 when the request body is missing', async function () {
            const response = await put(tokenUrl)
            response.statusCode.should.equal(400)
            response.json().should.have.property('code', 'FST_ERR_VALIDATION')
        })

        it('returns 400 for an empty name', async function () {
            const response = await put(tokenUrl, { name: '' })
            response.statusCode.should.equal(400)
            response.json().should.have.property('code', 'FST_ERR_VALIDATION')
        })

        it('returns 400 when name is missing', async function () {
            const response = await put(tokenUrl, {})
            response.statusCode.should.equal(400)
            response.json().should.have.property('code', 'FST_ERR_VALIDATION')
        })

        it('returns 400 when name is an object', async function () {
            const response = await put(tokenUrl, { name: { a: 1 } })
            response.statusCode.should.equal(400)
            response.json().should.have.property('code', 'FST_ERR_VALIDATION')
        })

        it('stores a numeric name as a string', async function () {
            const response = await put(tokenUrl, { name: 5 })
            response.statusCode.should.equal(200)
            response.json().should.have.property('name', '5')
            await token.reload()
            token.name.should.equal('5')
        })
    })

    describe('DELETE /tokens/:tokenId', function () {
        it('returns 404 for an undecodable token id', async function () {
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/teams/${app.team.hashid}/git/tokens/not-a-hashid!!`,
                cookies: { sid: cookie }
            })
            response.statusCode.should.equal(404)
            response.json().should.have.property('code', 'not_found')
        })
    })
})

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

    it('keeps the token id when the entry is read back through the audit log API', async function () {
        const created = await request('POST', '', { name: 'read back', token: 'abc', type: 'github' })
        const response = await app.inject({
            method: 'GET',
            url: `/api/v1/teams/${app.team.hashid}/audit-log`,
            cookies: { sid }
        })
        const entry = response.json().log.find(e => e.event === 'team.git.token.created')
        entry.body.gitToken.should.have.property('id', created.json().id)
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
