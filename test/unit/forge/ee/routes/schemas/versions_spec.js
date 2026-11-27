const should = require('should') // eslint-disable-line

const setup = require('../../setup')

const FF_UTIL = require('flowforge-test-utils')
const { Roles } = FF_UTIL.require('forge/lib/roles')

describe('Data Schemas API - versions, validate and diff', function () {
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

    const reading = {
        type: 'object',
        properties: {
            value: { type: 'number', unit: 'Cel' },
            sensor: { type: 'string' }
        },
        required: ['value']
    }

    let counter = 0
    // A schema with the given documents published as 1.0.0, 2.0.0 and so on, and no draft
    async function schemaWithVersions (...documents) {
        counter++
        const created = (await request('POST', '', 'bob', { name: `schema ${counter}`, schema: documents[0] })).json()
        for (let i = 0; i < documents.length; i++) {
            if (i > 0) {
                ;(await request('POST', `/${created.id}/draft`, 'bob', { schema: documents[i] })).statusCode.should.equal(200)
            }
            ;(await request('POST', `/${created.id}/draft/publish`, 'bob', { version: `${i + 1}.0.0` })).statusCode.should.equal(200)
        }
        return created
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

    it('lets viewers read, validate and diff but not deprecate or undeprecate', async function () {
        const schema = await schemaWithVersions(reading, reading)
        ;(await request('GET', `/${schema.id}/versions`, 'dave')).statusCode.should.equal(200)
        ;(await request('GET', `/${schema.id}/versions/1.0.0`, 'dave')).statusCode.should.equal(200)
        ;(await request('POST', `/${schema.id}/versions/1.0.0/validate`, 'dave', { payload: { value: 1 } })).statusCode.should.equal(200)
        ;(await request('GET', `/${schema.id}/diff?from=1.0.0&to=2.0.0`, 'dave')).statusCode.should.equal(200)
        ;(await request('POST', `/${schema.id}/versions/1.0.0/deprecate`, 'dave')).statusCode.should.equal(403)
        ;(await request('POST', `/${schema.id}/versions/1.0.0/undeprecate`, 'dave')).statusCode.should.equal(403)
    })

    it('lets members deprecate a version', async function () {
        const schema = await schemaWithVersions(reading)
        ;(await request('POST', `/${schema.id}/versions/1.0.0/deprecate`, 'chris')).statusCode.should.equal(200)
    })

    describe('versions', function () {
        it('lists published and deprecated versions newest first, without the draft', async function () {
            const schema = await schemaWithVersions(reading, reading, reading)
            await request('POST', `/${schema.id}/versions/2.0.0/deprecate`, 'bob')
            await request('POST', `/${schema.id}/draft`, 'bob')

            let body = (await request('GET', `/${schema.id}/versions`, 'bob')).json()
            body.versions.map(v => [v.version, v.status]).should.eql([['3.0.0', 'published'], ['2.0.0', 'deprecated'], ['1.0.0', 'published']])
            body.count.should.equal(3)
            body.versions[0].should.not.have.property('schema')

            body = (await request('GET', `/${schema.id}/versions?status=deprecated`, 'bob')).json()
            body.versions.map(v => v.version).should.eql(['2.0.0'])
        })

        it('gets an exact version or the latest published one', async function () {
            const schema = await schemaWithVersions(reading, { type: 'string' })
            await request('POST', `/${schema.id}/versions/2.0.0/deprecate`, 'bob')

            let version = (await request('GET', `/${schema.id}/versions/2.0.0`, 'bob')).json()
            version.should.containEql({ version: '2.0.0', status: 'deprecated' })
            version.schema.should.containEql({ type: 'string' })

            version = (await request('GET', `/${schema.id}/versions/latest`, 'bob')).json()
            version.version.should.equal('1.0.0')

            ;(await request('GET', `/${schema.id}/versions/9.0.0`, 'bob')).statusCode.should.equal(404)
        })

        it('returns 404 for latest when nothing is published', async function () {
            const created = (await request('POST', '', 'bob', { name: 'unpublished' })).json()
            ;(await request('GET', `/${created.id}/versions/latest`, 'bob')).statusCode.should.equal(404)
        })

        it('deprecates a version once', async function () {
            const schema = await schemaWithVersions(reading)
            const response = await request('POST', `/${schema.id}/versions/1.0.0/deprecate`, 'bob')
            response.statusCode.should.equal(200)
            response.json().status.should.equal('deprecated')
            ;(await lastAuditEvent()).should.equal('team.schema.version.deprecated')

            const again = await request('POST', `/${schema.id}/versions/1.0.0/deprecate`, 'bob')
            again.statusCode.should.equal(409)
            again.json().code.should.equal('already_deprecated')
            ;(await request('POST', `/${schema.id}/versions/9.0.0/deprecate`, 'bob')).statusCode.should.equal(404)
        })

        it('undeprecates a deprecated version, which becomes the latest again', async function () {
            const schema = await schemaWithVersions(reading, reading)
            await request('POST', `/${schema.id}/versions/2.0.0/deprecate`, 'bob')
            ;(await request('GET', `/${schema.id}/versions/latest`, 'bob')).json().version.should.equal('1.0.0')

            const response = await request('POST', `/${schema.id}/versions/2.0.0/undeprecate`, 'chris')
            response.statusCode.should.equal(200)
            response.json().status.should.equal('published')
            ;(await lastAuditEvent()).should.equal('team.schema.version.undeprecated')
            ;(await request('GET', `/${schema.id}/versions/latest`, 'bob')).json().version.should.equal('2.0.0')

            const again = await request('POST', `/${schema.id}/versions/2.0.0/undeprecate`, 'bob')
            again.statusCode.should.equal(409)
            again.json().code.should.equal('not_deprecated')
            ;(await request('POST', `/${schema.id}/versions/9.0.0/undeprecate`, 'bob')).statusCode.should.equal(404)
        })
    })

    describe('validate', function () {
        it('validates a payload against a version', async function () {
            const schema = await schemaWithVersions(reading)
            let response = await request('POST', `/${schema.id}/versions/1.0.0/validate`, 'bob', { payload: { value: 21.5, sensor: 'line-4' } })
            response.statusCode.should.equal(200)
            response.json().should.eql({ valid: true, errors: [] })

            response = await request('POST', `/${schema.id}/versions/latest/validate`, 'bob', { payload: { sensor: 4 } })
            const body = response.json()
            body.valid.should.be.false()
            body.errors.map(e => [e.path, e.keyword]).should.eql([['/value', 'required'], ['/sensor', 'type']])
            body.errors[1].message.should.equal('must be string')
        })

        it('validates any JSON value, including null', async function () {
            const schema = await schemaWithVersions({ type: 'number' })
            ;(await request('POST', `/${schema.id}/versions/1.0.0/validate`, 'bob', { payload: 4 })).json().valid.should.be.true()
            ;(await request('POST', `/${schema.id}/versions/1.0.0/validate`, 'bob', { payload: null })).json().valid.should.be.false()
        })

        it('requires a payload', async function () {
            const schema = await schemaWithVersions(reading)
            ;(await request('POST', `/${schema.id}/versions/1.0.0/validate`, 'bob', {})).statusCode.should.equal(400)
        })

        it('refuses a payload over the limit', async function () {
            const schema = await schemaWithVersions({ type: 'string' })
            const response = await request('POST', `/${schema.id}/versions/1.0.0/validate`, 'bob', { payload: 'x'.repeat(1024 * 1024 + 1) })
            response.statusCode.should.equal(400)
            response.json().code.should.equal('payload_too_large')
        })

        it('validates against the draft, unless it has problems', async function () {
            const schema = await schemaWithVersions(reading)
            ;(await request('POST', `/${schema.id}/draft/validate`, 'bob', { payload: {} })).statusCode.should.equal(404)

            await request('POST', `/${schema.id}/draft`, 'bob', { schema: { type: 'string' } })
            ;(await request('POST', `/${schema.id}/draft/validate`, 'bob', { payload: 'ok' })).json().valid.should.be.true()

            await request('PUT', `/${schema.id}/draft`, 'bob', { schema: { type: 'strin' } })
            const response = await request('POST', `/${schema.id}/draft/validate`, 'bob', { payload: 'ok' })
            response.statusCode.should.equal(400)
            response.json().code.should.equal('invalid_schema')
        })

        it('returns 404 for an unknown version', async function () {
            const schema = await schemaWithVersions(reading)
            ;(await request('POST', `/${schema.id}/versions/9.0.0/validate`, 'bob', { payload: {} })).statusCode.should.equal(404)
        })
    })

    describe('diff', function () {
        it('lists the changes between two versions', async function () {
            const changed = {
                ...reading,
                properties: {
                    value: { type: 'number', unit: 'K' },
                    readAt: { type: 'string' }
                }
            }
            const schema = await schemaWithVersions(reading, changed)
            const response = await request('GET', `/${schema.id}/diff?from=1.0.0&to=2.0.0`, 'bob')
            response.statusCode.should.equal(200)
            const body = response.json()
            body.should.containEql({ from: '1.0.0', to: '2.0.0' })
            body.changes.map(c => [c.path, c.type]).should.eql([
                ['/properties/readAt', 'added'],
                ['/properties/sensor', 'deleted'],
                ['/properties/value/unit', 'changed']
            ])
        })

        it('compares a version with the draft or latest', async function () {
            const schema = await schemaWithVersions(reading, reading)
            ;(await request('GET', `/${schema.id}/diff?from=1.0.0&to=latest`, 'bob')).json().should.eql({ from: '1.0.0', to: '2.0.0', changes: [] })

            ;(await request('GET', `/${schema.id}/diff?from=latest&to=draft`, 'bob')).statusCode.should.equal(404)
            await request('POST', `/${schema.id}/draft`, 'bob', { schema: { ...reading, description: 'Now described' } })
            const body = (await request('GET', `/${schema.id}/diff?from=latest&to=draft`, 'bob')).json()
            body.to.should.equal('draft')
            body.changes.should.eql([{ path: '/description', type: 'added', detail: { to: 'Now described' } }])
        })

        it('returns 404 for an unknown version and 400 without both versions', async function () {
            const schema = await schemaWithVersions(reading)
            ;(await request('GET', `/${schema.id}/diff?from=9.0.0&to=1.0.0`, 'bob')).statusCode.should.equal(404)
            ;(await request('GET', `/${schema.id}/diff?from=1.0.0&to=9.0.0`, 'bob')).statusCode.should.equal(404)
            ;(await request('GET', `/${schema.id}/diff?from=1.0.0`, 'bob')).statusCode.should.equal(400)
        })
    })
})
