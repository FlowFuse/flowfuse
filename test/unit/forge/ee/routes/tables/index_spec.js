const should = require('should') // eslint-disable-line
const setup = require('../../setup')

const FF_UTIL = require('flowforge-test-utils')
const { Roles } = FF_UTIL.require('forge/lib/roles')

describe('Tables API', function () {
    let app
    const TestObjects = { tokens: {} }

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

    before(async function () {
        app = await setup({
            tables: {
                enabled: true,
                driver: {
                    type: 'stub'
                }
            }
        })

        TestObjects.team = app.team
        TestObjects.application = app.application
        TestObjects.instance = app.instance

        TestObjects.alice = await app.db.models.User.byUsername('alice')
        await login('alice', 'aaPassword')
        TestObjects.bob = await app.db.models.User.create({ username: 'bob', name: 'Bob Solo', email: 'bob@example.com', email_verified: true, password: 'bbPassword' })
        await login('bob', 'bbPassword')
        await app.team.addUser(TestObjects.bob, { through: { role: Roles.Owner } })
        TestObjects.chris = await app.db.models.User.create({ username: 'chris', name: 'Chris Kenobi', email: 'chris@example.com', email_verified: true, password: 'ccPassword' })
        await app.team.addUser(TestObjects.chris, { through: { role: Roles.Member } })
        await login('chris', 'ccPassword')
        TestObjects.dave = await app.db.models.User.create({ admin: false, username: 'dave', name: 'Dave Vader', email: 'dave@example.com', email_verified: true, password: 'ddPassword' })
        await app.team.addUser(TestObjects.dave, { through: { role: Roles.Viewer } })
        await login('dave', 'ddPassword')

        const defaultTeamType = await app.db.models.TeamType.findOne({ where: { id: 1 } })
        const defaultTeamTypeProperties = defaultTeamType.properties

        if (defaultTeamTypeProperties.features) {
            defaultTeamTypeProperties.features.tables = true
        } else {
            defaultTeamTypeProperties.features = {
                tables: true
            }
        }
        app.defaultTeamType.properties = defaultTeamTypeProperties
        await app.defaultTeamType.save()
    })

    after(async function () {
        await app.close()
    })

    it('Get empty Team database list', async function () {
        const response = await app.inject({
            method: 'GET',
            url: `/api/v1/teams/${TestObjects.team.hashid}/databases`,
            cookies: { sid: TestObjects.tokens.bob }
        })
        response.statusCode.should.equal(200)
        response.json().should.be.an.Array().and.have.length(0)
    })

    it('Fail to get Team database list without permission', async function () {
        const response = await app.inject({
            method: 'GET',
            url: `/api/v1/teams/${TestObjects.team.hashid}/databases`,
            cookies: { sid: TestObjects.tokens.dave }
        })
        response.statusCode.should.equal(403)
    })

    it('Create a new Team database', async function () {
        const response = await app.inject({
            method: 'POST',
            url: `/api/v1/teams/${TestObjects.team.hashid}/databases`,
            cookies: { sid: TestObjects.tokens.bob },
            payload: { }
        })
        response.statusCode.should.equal(200)
        const db = response.json()
        db.should.have.property('id')
        db.should.have.property('name', TestObjects.team.hashid)
        db.should.have.property('credentials')
        db.credentials.should.have.property('host', 'localhost')
        db.credentials.should.have.property('port', 5432)
    })

    it('Create a new Team database when already exists', async function () {
        const response = await app.inject({
            method: 'POST',
            url: `/api/v1/teams/${TestObjects.team.hashid}/databases`,
            cookies: { sid: TestObjects.tokens.bob },
            payload: { name: 'Test Database' }
        })
        response.statusCode.should.equal(409)
    })

    it('Get Team database list after creation', async function () {
        const response = await app.inject({
            method: 'GET',
            url: `/api/v1/teams/${TestObjects.team.hashid}/databases`,
            cookies: { sid: TestObjects.tokens.bob }
        })
        response.statusCode.should.equal(200)
        const dbs = response.json()
        dbs.should.be.an.Array().and.have.length(1)
        dbs[0].should.have.property('id')
        dbs[0].should.have.property('name', TestObjects.team.hashid)
    })

    it('Get Team database by ID', async function () {
        const db = (await app.db.models.Table.byTeamId(TestObjects.team.id))[0]
        const response = await app.inject({
            method: 'GET',
            url: `/api/v1/teams/${TestObjects.team.hashid}/databases/${db.hashid}`,
            cookies: { sid: TestObjects.tokens.bob }
        })
        response.statusCode.should.equal(200)
        const creds = response.json()
        creds.should.have.property('id', db.hashid)
        creds.should.have.property('name', TestObjects.team.hashid)
        creds.should.have.property('credentials')
        creds.credentials.should.have.property('host', 'localhost')
        creds.credentials.should.have.property('port', 5432)
    })

    it('Fail to get Team database by ID without permission', async function () {
        const db = (await app.db.models.Table.byTeamId(TestObjects.team.id))[0]
        const response = await app.inject({
            method: 'GET',
            url: `/api/v1/teams/${TestObjects.team.hashid}/databases/${db.hashid}`,
            cookies: { sid: TestObjects.tokens.dave }
        })
        response.statusCode.should.equal(403)
    })

    it('Fail to get non-existent Team database by ID', async function () {
        const response = await app.inject({
            method: 'GET',
            url: `/api/v1/teams/${TestObjects.team.hashid}/databases/nonexistent`,
            cookies: { sid: TestObjects.tokens.bob }
        })
        response.statusCode.should.equal(404)
        response.json().should.have.property('code', 'not_found')
    })

    it('Get tables list for Team', async function () {
        const db = (await app.db.models.Table.byTeamId(TestObjects.team.id))[0]
        const response = await app.inject({
            method: 'GET',
            url: `/api/v1/teams/${TestObjects.team.hashid}/databases/${db.hashid}/tables`,
            cookies: { sid: TestObjects.tokens.bob }
        })
        response.statusCode.should.equal(200)
        const tables = response.json()
        tables.tables.should.be.an.Array().and.have.length(2)
        tables.tables[0].should.have.property('name', 'table1')
        tables.tables[1].should.have.property('name', 'table2')
    })

    it('Get details for a table', async function () {
        const db = (await app.db.models.Table.byTeamId(TestObjects.team.id))[0]
        const response = await app.inject({
            method: 'GET',
            url: `/api/v1/teams/${TestObjects.team.hashid}/databases/${db.hashid}/tables/table1`,
            cookies: { sid: TestObjects.tokens.bob }
        })
        response.statusCode.should.equal(200)
        const columns = response.json()
        columns.should.be.an.Array().and.have.length(2)
        columns[0].should.have.property('name', 'id')
        columns[0].should.have.property('type', 'integer')
        columns[1].should.have.property('name', 'name')
        columns[1].should.have.property('type', 'text')
    })

    it('Fail to delete database without permission', async function () {
        const db = (await app.db.models.Table.byTeamId(TestObjects.team.id))[0]
        const response = await app.inject({
            method: 'DELETE',
            url: `/api/v1/teams/${TestObjects.team.hashid}/databases/${db.hashid}`,
            cookies: { sid: TestObjects.tokens.dave }
        })
        response.statusCode.should.equal(403)
    })

    it('Delete Team database', async function () {
        const db = (await app.db.models.Table.byTeamId(TestObjects.team.id))[0]
        const response = await app.inject({
            method: 'DELETE',
            url: `/api/v1/teams/${TestObjects.team.hashid}/databases/${db.hashid}`,
            cookies: { sid: TestObjects.tokens.bob }
        })
        response.statusCode.should.equal(200)
    })
})
