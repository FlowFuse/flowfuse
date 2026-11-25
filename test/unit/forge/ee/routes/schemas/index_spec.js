const should = require('should')

const setup = require('../../setup')

const FF_UTIL = require('flowforge-test-utils')
const { Roles } = FF_UTIL.require('forge/lib/roles')

describe('Data Schemas API', function () {
    let app
    const TestObjects = { tokens: {} }

    async function login (username, password) {
        const response = await app.inject({
            method: 'POST',
            url: '/account/login',
            payload: { username, password, remember: false }
        })
        TestObjects.tokens[username] = response.cookies[0].value
    }

    async function setSchemasFeature (enabled) {
        const properties = { ...app.defaultTeamType.properties }
        properties.enableAllFeatures = false
        properties.features = { ...(properties.features || {}), schemas: enabled }
        app.defaultTeamType.properties = properties
        await app.defaultTeamType.save()
    }

    function request (method, path, user, payload) {
        return app.inject({
            method,
            url: `/api/v1/teams/${TestObjects.team.hashid}/schemas${path}`,
            cookies: { sid: TestObjects.tokens[user] },
            payload
        })
    }

    async function lastAuditEvent () {
        const entry = await app.db.models.AuditLog.findOne({ order: [['id', 'DESC']] })
        return entry.event
    }

    let counter = 0
    function uniqueName (prefix) {
        counter++
        return `${prefix} ${counter}`
    }

    async function createSchema (payload = {}) {
        const response = await request('POST', '', 'bob', { name: uniqueName('schema'), ...payload })
        response.statusCode.should.equal(200)
        return response.json()
    }

    async function createGroup (name = uniqueName('group')) {
        const response = await request('POST', '/groups', 'bob', { name })
        response.statusCode.should.equal(200)
        return response.json()
    }

    before(async function () {
        app = await setup()
        TestObjects.team = app.team
        TestObjects.alice = await app.db.models.User.byUsername('alice')
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

        TestObjects.otherTeam = await app.factory.createTeam({ name: 'BTeam' })
        await TestObjects.otherTeam.addUser(TestObjects.alice, { through: { role: Roles.Owner } })

        await setSchemasFeature(true)
    })

    after(async function () {
        await app.close()
    })

    describe('feature gate', function () {
        it('returns 404 when the team type does not enable schemas', async function () {
            await setSchemasFeature(false)
            try {
                const response = await request('GET', '', 'bob')
                response.statusCode.should.equal(404)
            } finally {
                await setSchemasFeature(true)
            }
        })

        it('returns 404 for a schema or group from another team', async function () {
            const other = await app.db.models.DataSchema.create({ name: 'Other', TeamId: TestObjects.otherTeam.id })
            const otherGroup = await app.db.models.DataSchemaGroup.create({ name: 'Other', TeamId: TestObjects.otherTeam.id })
            ;(await request('GET', `/${other.hashid}`, 'alice')).statusCode.should.equal(404)
            ;(await request('PUT', `/groups/${otherGroup.hashid}`, 'alice', { name: 'x' })).statusCode.should.equal(404)
            ;(await request('GET', '/doesnotexist', 'alice')).statusCode.should.equal(404)
        })
    })

    describe('permissions', function () {
        it('lets viewers read but not write', async function () {
            const schema = await createSchema()
            const group = await createGroup()
            ;(await request('GET', '', 'dave')).statusCode.should.equal(200)
            ;(await request('GET', `/${schema.id}`, 'dave')).statusCode.should.equal(200)
            ;(await request('GET', '/groups', 'dave')).statusCode.should.equal(200)
            ;(await request('POST', '', 'dave', { name: uniqueName('schema') })).statusCode.should.equal(403)
            ;(await request('PUT', `/${schema.id}`, 'dave', { name: 'x' })).statusCode.should.equal(403)
            ;(await request('DELETE', `/${schema.id}`, 'dave')).statusCode.should.equal(403)
            ;(await request('POST', '/groups', 'dave', { name: 'x' })).statusCode.should.equal(403)
            ;(await request('PUT', `/groups/${group.id}`, 'dave', { name: 'x' })).statusCode.should.equal(403)
            ;(await request('DELETE', `/groups/${group.id}`, 'dave')).statusCode.should.equal(403)
        })

        it('lets members create, edit and delete', async function () {
            const created = await request('POST', '', 'chris', { name: uniqueName('schema') })
            created.statusCode.should.equal(200)
            const schema = created.json()
            ;(await request('PUT', `/${schema.id}`, 'chris', { name: uniqueName('schema') })).statusCode.should.equal(200)
            ;(await request('DELETE', `/${schema.id}`, 'chris')).statusCode.should.equal(200)

            const createdGroup = await request('POST', '/groups', 'chris', { name: uniqueName('group') })
            createdGroup.statusCode.should.equal(200)
            const group = createdGroup.json()
            ;(await request('PUT', `/groups/${group.id}`, 'chris', { name: uniqueName('group') })).statusCode.should.equal(200)
            ;(await request('DELETE', `/groups/${group.id}`, 'chris')).statusCode.should.equal(200)
        })
    })

    describe('schemas', function () {
        it('creates a schema with its draft', async function () {
            const schema = await createSchema({ description: 'A reading', notes: 'First draft' })
            schema.should.containEql({ description: 'A reading', group: null, latestVersion: null, hasDraft: true })
            schema.versions.should.have.length(1)
            schema.versions[0].should.containEql({ version: null, status: 'draft', notes: 'First draft' })
            schema.versions[0].createdBy.username.should.equal('bob')
            ;(await lastAuditEvent()).should.equal('team.schema.created')

            const draft = await app.db.models.DataSchemaVersion.findOne({ where: { DataSchemaId: (await app.db.models.DataSchema.byId(schema.id)).id } })
            draft.schema.should.eql({ type: 'object', properties: {} })
        })

        it('saves the draft document without its $id', async function () {
            const schema = await createSchema({ schema: { $id: 'https://example.com/mine', type: 'string' } })
            const draft = await app.db.models.DataSchemaVersion.findOne({ where: { DataSchemaId: (await app.db.models.DataSchema.byId(schema.id)).id } })
            draft.schema.should.eql({ type: 'string' })
        })

        it('saves a draft that does not compile yet', async function () {
            await createSchema({ schema: { type: 'strin' } })
        })

        it('rejects a document with references', async function () {
            const response = await request('POST', '', 'bob', { name: uniqueName('schema'), schema: { $ref: '#/x' } })
            response.statusCode.should.equal(400)
            response.json().should.containEql({ code: 'references_not_supported', path: '/$ref' })
        })

        it('rejects a duplicate or empty name', async function () {
            const schema = await createSchema()
            const duplicate = await request('POST', '', 'bob', { name: schema.name })
            duplicate.statusCode.should.equal(409)
            duplicate.json().code.should.equal('name_conflict')
            ;(await app.db.models.DataSchema.count({ where: { name: schema.name } })).should.equal(1)

            const empty = await request('POST', '', 'bob', { name: '  ' })
            empty.statusCode.should.equal(400)
            empty.json().code.should.equal('invalid_request')
        })

        it('creates a schema in a group of the team only', async function () {
            const group = await createGroup()
            const schema = await createSchema({ groupId: group.id })
            schema.group.should.eql({ id: group.id, name: group.name })

            const otherGroup = await app.db.models.DataSchemaGroup.create({ name: uniqueName('group'), TeamId: TestObjects.otherTeam.id })
            const response = await request('POST', '', 'bob', { name: uniqueName('schema'), groupId: otherGroup.hashid })
            response.statusCode.should.equal(400)
            response.json().code.should.equal('invalid_group')
        })

        it('gets a schema with its versions', async function () {
            const created = await createSchema()
            const response = await request('GET', `/${created.id}`, 'dave')
            response.statusCode.should.equal(200)
            const schema = response.json()
            schema.should.containEql({ id: created.id, name: created.name })
            schema.versions.should.have.length(1)
        })

        it('updates the name, description and group', async function () {
            const group = await createGroup()
            const created = await createSchema()
            const newName = uniqueName('renamed')
            let response = await request('PUT', `/${created.id}`, 'bob', { name: newName, description: 'Now described', groupId: group.id })
            response.statusCode.should.equal(200)
            response.json().should.containEql({ name: newName, description: 'Now described', group: { id: group.id, name: group.name } })

            const audit = await app.db.models.AuditLog.findOne({ order: [['id', 'DESC']] })
            audit.event.should.equal('team.schema.updated')
            JSON.parse(audit.body).updates.map(u => u.key).sort().should.eql(['description', 'group', 'name'])

            response = await request('PUT', `/${created.id}`, 'bob', { groupId: null })
            response.statusCode.should.equal(200)
            should(response.json().group).be.null()
        })

        it('rejects an update to a duplicate name or a group from another team', async function () {
            const first = await createSchema()
            const second = await createSchema()
            const duplicate = await request('PUT', `/${second.id}`, 'bob', { name: first.name })
            duplicate.statusCode.should.equal(409)

            const otherGroup = await app.db.models.DataSchemaGroup.create({ name: uniqueName('group'), TeamId: TestObjects.otherTeam.id })
            const invalid = await request('PUT', `/${second.id}`, 'bob', { groupId: otherGroup.hashid })
            invalid.statusCode.should.equal(400)
            invalid.json().code.should.equal('invalid_group')
        })

        it('deletes a schema with all its versions', async function () {
            const created = await createSchema()
            const schema = await app.db.models.DataSchema.byId(created.id)
            await app.db.models.DataSchemaVersion.create({ DataSchemaId: schema.id, status: 'published', version: '1.0.0', schema: {} })

            const response = await request('DELETE', `/${created.id}`, 'bob')
            response.statusCode.should.equal(200)
            ;(await lastAuditEvent()).should.equal('team.schema.deleted')
            should(await app.db.models.DataSchema.findByPk(schema.id)).be.null()
            ;(await app.db.models.DataSchemaVersion.count({ where: { DataSchemaId: schema.id } })).should.equal(0)
            ;(await request('GET', `/${created.id}`, 'bob')).statusCode.should.equal(404)
        })

        describe('list', function () {
            let listTeam
            let group
            function list (query = '') {
                return app.inject({
                    method: 'GET',
                    url: `/api/v1/teams/${listTeam.hashid}/schemas${query}`,
                    cookies: { sid: TestObjects.tokens.alice }
                })
            }

            before(async function () {
                listTeam = await app.factory.createTeam({ name: 'ListTeam' })
                await listTeam.addUser(TestObjects.alice, { through: { role: Roles.Owner } })
                group = await app.db.models.DataSchemaGroup.create({ name: 'Energy', TeamId: listTeam.id })
                await app.db.models.DataSchema.create({ name: 'Meter reading', TeamId: listTeam.id, DataSchemaGroupId: group.id })
                await app.db.models.DataSchema.create({ name: 'Press status', description: 'meter of the press', TeamId: listTeam.id })
                await app.db.models.DataSchema.create({ name: 'Alarm', TeamId: listTeam.id })
            })

            it('lists every schema in the team', async function () {
                const response = await list()
                response.statusCode.should.equal(200)
                const body = response.json()
                body.count.should.equal(3)
                body.schemas.map(s => s.name).should.eql(['Meter reading', 'Press status', 'Alarm'])
            })

            it('searches names and descriptions', async function () {
                const body = (await list('?query=meter')).json()
                body.schemas.map(s => s.name).should.eql(['Meter reading', 'Press status'])
            })

            it('filters by exact name', async function () {
                ;(await list('?name=Alarm')).json().schemas.map(s => s.name).should.eql(['Alarm'])
                ;(await list('?name=alarm')).json().schemas.should.have.length(0)
            })

            it('filters by group, or schemas without one', async function () {
                ;(await list(`?groupId=${group.hashid}`)).json().schemas.map(s => s.name).should.eql(['Meter reading'])
                ;(await list('?groupId=none')).json().schemas.map(s => s.name).should.eql(['Press status', 'Alarm'])
                ;(await list('?groupId=unknown')).statusCode.should.equal(400)
            })

            it('paginates', async function () {
                const page1 = (await list('?limit=2')).json()
                page1.schemas.should.have.length(2)
                const page2 = (await list(`?limit=2&cursor=${page1.meta.next_cursor}`)).json()
                page2.schemas.map(s => s.name).should.eql(['Alarm'])
                ;(await list('?cursor=bad')).statusCode.should.equal(400)
            })

            describe('a group at a time', function () {
                const names = (section) => section.schemas.map(s => s.name)

                it('lists every group by name, empty ones included, then the schemas without a group', async function () {
                    const empty = await app.db.models.DataSchemaGroup.create({ name: 'Assembly', TeamId: listTeam.id })
                    const response = await list('/grouped')
                    await empty.destroy()
                    response.statusCode.should.equal(200)
                    const body = response.json()
                    body.count.should.equal(3)
                    body.sections.map(section => section.group?.name ?? null).should.eql(['Assembly', 'Energy', null])
                    body.sections.map(section => section.count).should.eql([0, 1, 2])
                    body.sections[1].group.should.have.properties({ id: group.hashid, schemaCount: 1 })
                    names(body.sections[1]).should.eql(['Meter reading'])
                    body.sections[1].schemas[0].group.should.eql({ id: group.hashid, name: 'Energy' })
                    names(body.sections[2]).should.eql(['Press status', 'Alarm'])
                })

                it('returns the first schemas of each section, and where to carry on from', async function () {
                    const [energy, ungrouped] = (await list('/grouped?limit=1')).json().sections
                    names(energy).should.eql(['Meter reading'])
                    should.not.exist(energy.meta.next_cursor)
                    names(ungrouped).should.eql(['Press status'])
                    ungrouped.count.should.equal(2)
                    const more = (await list(`?groupId=none&limit=1&cursor=${ungrouped.meta.next_cursor}`)).json()
                    more.schemas.map(s => s.name).should.eql(['Alarm'])
                })

                it('searches names and descriptions within each section, keeping the sections nothing matched in', async function () {
                    const body = (await list('/grouped?query=PRESS')).json()
                    body.count.should.equal(1)
                    const [energy, ungrouped] = body.sections
                    energy.count.should.equal(0)
                    energy.schemas.should.have.length(0)
                    names(ungrouped).should.eql(['Press status'])
                })

                it('keeps every schema of a group whose own name matches the search', async function () {
                    const [energy, ungrouped] = (await list('/grouped?query=nerg')).json().sections
                    names(energy).should.eql(['Meter reading'])
                    ungrouped.count.should.equal(0)
                })

                it('does not include another team\'s schemas', async function () {
                    const other = await createSchema()
                    const ids = (await list('/grouped')).json().sections.flatMap(section => section.schemas.map(s => s.id))
                    ids.should.not.containEql(other.id)
                })

                it('needs a member of the team', async function () {
                    const response = await app.inject({
                        method: 'GET',
                        url: `/api/v1/teams/${listTeam.hashid}/schemas/grouped`,
                        cookies: { sid: TestObjects.tokens.chris }
                    })
                    response.statusCode.should.be.oneOf(403, 404)
                })
            })
        })
    })

    describe('groups', function () {
        it('creates, lists, renames and deletes a group', async function () {
            const group = await createGroup('Production line')
            group.should.containEql({ name: 'Production line', schemaCount: 0 })
            ;(await lastAuditEvent()).should.equal('team.schema.group.created')

            const schema = await createSchema({ groupId: group.id })

            const list = (await request('GET', '/groups', 'dave')).json()
            list.groups.find(g => g.id === group.id).schemaCount.should.equal(1)
            list.count.should.equal(list.groups.length)

            const renamed = await request('PUT', `/groups/${group.id}`, 'bob', { name: 'Line 2' })
            renamed.statusCode.should.equal(200)
            renamed.json().should.containEql({ name: 'Line 2', schemaCount: 1 })
            ;(await lastAuditEvent()).should.equal('team.schema.group.updated')

            const deleted = await request('DELETE', `/groups/${group.id}`, 'bob')
            deleted.statusCode.should.equal(200)
            ;(await lastAuditEvent()).should.equal('team.schema.group.deleted')
            const kept = (await request('GET', `/${schema.id}`, 'bob')).json()
            should(kept.group).be.null()
        })

        it('lists groups sorted by name', async function () {
            const listTeam = await app.factory.createTeam({ name: 'GroupListTeam' })
            await listTeam.addUser(TestObjects.alice, { through: { role: Roles.Owner } })
            for (const name of ['Zeta', 'Alpha', 'Mid']) {
                await app.db.models.DataSchemaGroup.create({ name, TeamId: listTeam.id })
            }
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${listTeam.hashid}/schemas/groups`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.json().groups.map(g => g.name).should.eql(['Alpha', 'Mid', 'Zeta'])
        })

        it('rejects a duplicate name', async function () {
            const group = await createGroup()
            const other = await createGroup()
            ;(await request('POST', '/groups', 'bob', { name: group.name })).statusCode.should.equal(409)
            ;(await request('PUT', `/groups/${other.id}`, 'bob', { name: group.name })).statusCode.should.equal(409)
        })

        it('does not log a rename to the same name', async function () {
            const group = await createGroup()
            await request('PUT', `/groups/${group.id}`, 'bob', { name: group.name })
            ;(await lastAuditEvent()).should.equal('team.schema.group.created')
        })
    })
})

describe('Data Schemas API without a licence', function () {
    let app

    before(async function () {
        app = await setup({ license: undefined })
    })

    after(async function () {
        await app.close()
    })

    it('is not available', async function () {
        const login = await app.inject({
            method: 'POST',
            url: '/account/login',
            payload: { username: 'alice', password: 'aaPassword', remember: false }
        })
        const response = await app.inject({
            method: 'GET',
            url: `/api/v1/teams/${app.team.hashid}/schemas`,
            cookies: { sid: login.cookies[0].value }
        })
        response.statusCode.should.equal(404)
    })
})
