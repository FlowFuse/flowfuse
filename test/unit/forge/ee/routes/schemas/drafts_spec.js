const should = require('should')
const sinon = require('sinon')

const setup = require('../../setup')

const FF_UTIL = require('flowforge-test-utils')
const { Roles } = FF_UTIL.require('forge/lib/roles')

describe('Data Schemas API - draft and publish', function () {
    let app
    const tokens = {}

    async function login (username, password) {
        const response = await app.inject({
            method: 'POST',
            url: '/account/login',
            payload: { username, password, remember: false }
        })
        tokens[username] = response.cookies[0].value
    }

    function request (method, path, user, payload) {
        return app.inject({
            method,
            url: `/api/v1/teams/${app.team.hashid}/schemas${path}`,
            cookies: { sid: tokens[user] },
            payload: payload ?? (method === 'POST' || method === 'PUT' ? {} : undefined)
        })
    }

    async function lastAuditEvent () {
        const entry = await app.db.models.AuditLog.findOne({ order: [['id', 'DESC']] })
        return entry.event
    }

    let counter = 0
    async function createSchema (payload = {}) {
        counter++
        const response = await request('POST', '', 'bob', { name: `schema ${counter}`, ...payload })
        response.statusCode.should.equal(200)
        return response.json()
    }

    function publish (schema, version, user = 'bob', notes) {
        return request('POST', `/${schema.id}/draft/publish`, user, { version, notes })
    }

    // A schema with versions already published, and no draft
    async function schemaWithVersions (...versions) {
        const schema = await createSchema({ schema: { type: 'object', properties: { value: { type: 'number' } } } })
        for (const version of versions) {
            if ((await request('GET', `/${schema.id}/draft`, 'bob')).statusCode === 404) {
                ;(await request('POST', `/${schema.id}/draft`, 'bob')).statusCode.should.equal(200)
            }
            ;(await publish(schema, version)).statusCode.should.equal(200)
        }
        return schema
    }

    before(async function () {
        app = await setup()
        await login('alice', 'aaPassword')
        const users = [
            ['bob', Roles.Owner],
            ['chris', Roles.Member],
            ['dave', Roles.Viewer]
        ]
        for (const [username, role] of users) {
            const user = await app.db.models.User.create({ username, name: username, email: `${username}@example.com`, email_verified: true, password: `${username}Password` })
            await app.team.addUser(user, { through: { role } })
            await login(username, `${username}Password`)
        }
        const properties = { ...app.defaultTeamType.properties }
        properties.features = { ...(properties.features || {}), schemas: true }
        app.defaultTeamType.properties = properties
        await app.defaultTeamType.save()
    })

    after(async function () {
        await app.close()
    })

    it('lets viewers read the draft but not change it', async function () {
        const schema = await createSchema()
        ;(await request('GET', `/${schema.id}/draft`, 'dave')).statusCode.should.equal(200)
        ;(await request('PUT', `/${schema.id}/draft`, 'dave', { notes: 'x' })).statusCode.should.equal(403)
        ;(await request('DELETE', `/${schema.id}/draft`, 'dave')).statusCode.should.equal(403)
        ;(await request('POST', `/${schema.id}/draft`, 'dave')).statusCode.should.equal(403)
        ;(await publish(schema, '1.0.0', 'dave')).statusCode.should.equal(403)
    })

    it('lets members change, publish, start and discard the draft', async function () {
        const schema = await createSchema()
        ;(await request('PUT', `/${schema.id}/draft`, 'chris', { notes: 'x' })).statusCode.should.equal(200)
        ;(await publish(schema, '1.0.0', 'chris')).statusCode.should.equal(200)
        ;(await request('POST', `/${schema.id}/draft`, 'chris')).statusCode.should.equal(200)
        ;(await request('DELETE', `/${schema.id}/draft`, 'chris')).statusCode.should.equal(200)
    })

    describe('draft', function () {
        it('gets the draft with its problems', async function () {
            const schema = await createSchema({ schema: { type: 'strin' } })
            const response = await request('GET', `/${schema.id}/draft`, 'dave')
            response.statusCode.should.equal(200)
            const draft = response.json()
            draft.should.containEql({ version: null, status: 'draft', schema: { type: 'strin' } })
            draft.problems.length.should.be.above(0)
            draft.createdBy.username.should.equal('bob')
        })

        it('saves the draft, without its $id and even with problems', async function () {
            const schema = await createSchema()
            let response = await request('PUT', `/${schema.id}/draft`, 'bob', { schema: { $id: 'urn:mine', type: 'number', minimum: 'zero' }, notes: 'Adds a minimum' })
            response.statusCode.should.equal(200)
            let draft = response.json()
            draft.schema.should.eql({ type: 'number', minimum: 'zero' })
            draft.notes.should.equal('Adds a minimum')
            draft.problems.should.have.length(1)

            response = await request('PUT', `/${schema.id}/draft`, 'bob', { schema: { type: 'number', minimum: 0 } })
            draft = response.json()
            draft.problems.should.eql([])
            draft.notes.should.equal('Adds a minimum')
        })

        it('rejects a document with references or over the limits', async function () {
            const schema = await createSchema()
            const refs = await request('PUT', `/${schema.id}/draft`, 'bob', { schema: { properties: { a: { $ref: '#/x' } } } })
            refs.statusCode.should.equal(400)
            refs.json().code.should.equal('references_not_supported')

            const large = await request('PUT', `/${schema.id}/draft`, 'bob', { schema: { description: 'x'.repeat(300 * 1024) } })
            large.statusCode.should.equal(400)
            large.json().code.should.equal('document_too_large')
        })

        it('discards the draft', async function () {
            const schema = await createSchema()
            const response = await request('DELETE', `/${schema.id}/draft`, 'bob')
            response.statusCode.should.equal(200)
            ;(await lastAuditEvent()).should.equal('team.schema.draft.discarded')
            ;(await request('GET', `/${schema.id}/draft`, 'bob')).statusCode.should.equal(404)
            ;(await request('PUT', `/${schema.id}/draft`, 'bob', { notes: 'x' })).statusCode.should.equal(404)
            ;(await request('DELETE', `/${schema.id}/draft`, 'bob')).statusCode.should.equal(404)
            ;(await request('GET', `/${schema.id}`, 'bob')).json().hasDraft.should.be.false()
        })

        it('refuses a second draft', async function () {
            const schema = await createSchema()
            const response = await request('POST', `/${schema.id}/draft`, 'bob')
            response.statusCode.should.equal(409)
            response.json().code.should.equal('draft_exists')
        })

        it('leaves one draft when two are started at once', async function () {
            const schema = await createSchema()
            await request('DELETE', `/${schema.id}/draft`, 'bob')
            const responses = await Promise.all([
                request('POST', `/${schema.id}/draft`, 'bob'),
                request('POST', `/${schema.id}/draft`, 'bob')
            ])
            responses.map(r => r.statusCode).sort().should.eql([200, 409])
            const dbSchema = await app.db.models.DataSchema.byId(schema.id)
            ;(await app.db.models.DataSchemaVersion.count({ where: { DataSchemaId: dbSchema.id, status: 'draft' } })).should.equal(1)
        })

        it('starts a draft from the latest published version, without its $id', async function () {
            const schema = await schemaWithVersions('1.0.0')
            const response = await request('POST', `/${schema.id}/draft`, 'bob')
            response.statusCode.should.equal(200)
            response.json().schema.should.eql({ type: 'object', properties: { value: { type: 'number' } } })
            ;(await lastAuditEvent()).should.equal('team.schema.draft.created')
        })

        it('starts a draft from a given version or document', async function () {
            const schema = await schemaWithVersions('1.0.0')
            await request('POST', `/${schema.id}/draft`, 'bob', { schema: { type: 'string' } })
            ;(await publish(schema, '2.0.0')).statusCode.should.equal(200)

            let response = await request('POST', `/${schema.id}/draft`, 'bob', { from: '1.0.0', notes: 'Back to objects' })
            response.json().should.containEql({ notes: 'Back to objects', schema: { type: 'object', properties: { value: { type: 'number' } } } })

            await request('DELETE', `/${schema.id}/draft`, 'bob')
            response = await request('POST', `/${schema.id}/draft`, 'bob', { schema: { $id: 'urn:x', type: 'boolean' } })
            response.json().schema.should.eql({ type: 'boolean' })

            await request('DELETE', `/${schema.id}/draft`, 'bob')
            response = await request('POST', `/${schema.id}/draft`, 'bob', { from: '9.9.9' })
            response.statusCode.should.equal(400)
            response.json().code.should.equal('unknown_version')
        })

        it('starts an empty draft when nothing is published', async function () {
            const schema = await createSchema({ schema: { type: 'string' } })
            await request('DELETE', `/${schema.id}/draft`, 'bob')
            const response = await request('POST', `/${schema.id}/draft`, 'bob')
            response.json().schema.should.eql({ type: 'object', properties: {} })
        })
    })

    describe('publish', function () {
        it('publishes the first version with any valid version', async function () {
            const schema = await createSchema({ notes: 'Initial' })
            const response = await publish(schema, '0.3.0')
            response.statusCode.should.equal(200)
            const version = response.json()
            version.should.containEql({ version: '0.3.0', status: 'published', notes: 'Initial' })
            version.schema.$id.should.equal(`urn:flowfuse:schema:${schema.id}:0.3.0`)
            version.publishedBy.username.should.equal('bob')
            should.exist(version.publishedAt)
            ;(await lastAuditEvent()).should.equal('team.schema.version.published')

            const after = (await request('GET', `/${schema.id}`, 'bob')).json()
            after.should.containEql({ latestVersion: '0.3.0', hasDraft: false })
            ;(await request('GET', `/${schema.id}/draft`, 'bob')).statusCode.should.equal(404)
        })

        it('replaces the notes when given', async function () {
            const schema = await createSchema({ notes: 'Draft notes' })
            const response = await publish(schema, '1.0.0', 'bob', 'Release notes')
            response.json().notes.should.equal('Release notes')
        })

        it('rejects a version that is not plain major.minor.patch', async function () {
            const schema = await createSchema()
            for (const version of ['v1.0.0', '1.0', '1.0.0-rc.1', '1.0.0+build', ' 1.0.0', '01.0.0']) {
                const response = await publish(schema, version)
                response.statusCode.should.equal(400)
                response.json().code.should.equal('invalid_version')
            }
        })

        it('rejects an existing version, including a deprecated one', async function () {
            const schema = await schemaWithVersions('1.0.0', '1.1.0')
            const dbSchema = await app.db.models.DataSchema.byId(schema.id)
            await (await app.db.models.DataSchemaVersion.byVersion(dbSchema.id, '1.1.0')).update({ status: 'deprecated' })
            await request('POST', `/${schema.id}/draft`, 'bob')

            for (const version of ['1.0.0', '1.1.0']) {
                const response = await publish(schema, version)
                response.statusCode.should.equal(409)
                response.json().code.should.equal('version_exists')
            }
        })

        it('rejects a version lower than the highest one', async function () {
            const schema = await schemaWithVersions('1.9.0', '1.10.0')
            await request('POST', `/${schema.id}/draft`, 'bob')
            const response = await publish(schema, '1.9.5')
            response.statusCode.should.equal(409)
            response.json().should.containEql({ code: 'version_not_higher', highest: '1.10.0' })
            ;(await publish(schema, '1.11.0')).statusCode.should.equal(200)
        })

        it('rejects a draft with problems', async function () {
            const schema = await createSchema({ schema: { type: 'strin' } })
            const response = await publish(schema, '1.0.0')
            response.statusCode.should.equal(400)
            response.json().code.should.equal('schema_has_problems')
            response.json().problems.length.should.be.above(0)
        })

        it('returns 404 when there is no draft', async function () {
            const schema = await createSchema()
            await request('DELETE', `/${schema.id}/draft`, 'bob')
            ;(await publish(schema, '1.0.0')).statusCode.should.equal(404)
        })

        it('publishes once when two publishes race', async function () {
            const schema = await createSchema()
            const responses = await Promise.all([publish(schema, '1.0.0'), publish(schema, '2.0.0')])
            const codes = responses.map(r => r.statusCode).sort()
            codes[0].should.equal(200)
            codes[1].should.be.oneOf([404, 409])
            const versions = (await request('GET', `/${schema.id}`, 'bob')).json().versions
            versions.should.have.length(1)
            versions[0].status.should.equal('published')
        })

        it('does not save or discard a draft published after it was loaded', async function () {
            const schema = await createSchema({ schema: { type: 'string' } })
            const dbSchema = await app.db.models.DataSchema.byId(schema.id)
            const stale = await app.db.models.DataSchemaVersion.draftFor(dbSchema.id)
            ;(await publish(schema, '1.0.0')).statusCode.should.equal(200)

            const draftFor = sinon.stub(app.db.models.DataSchemaVersion, 'draftFor').resolves(stale)
            try {
                const saved = await request('PUT', `/${schema.id}/draft`, 'bob', { schema: { type: 'number' }, notes: 'x' })
                saved.statusCode.should.equal(409)
                saved.json().code.should.equal('draft_changed')
                const discarded = await request('DELETE', `/${schema.id}/draft`, 'bob')
                discarded.statusCode.should.equal(409)
                discarded.json().code.should.equal('draft_changed')
            } finally {
                draftFor.restore()
            }

            const published = await app.db.models.DataSchemaVersion.byVersion(dbSchema.id, '1.0.0')
            published.status.should.equal('published')
            published.schema.type.should.equal('string')
            should.not.exist(published.notes)
        })
    })
})
