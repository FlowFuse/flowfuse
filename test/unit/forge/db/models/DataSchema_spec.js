const should = require('should')

const setup = require('../setup')

describe('DataSchema models', function () {
    let app
    let team
    let otherTeam
    let user
    let counter = 0

    before(async function () {
        app = await setup()
        team = app.TestObjects.team1
        otherTeam = app.TestObjects.team2
        user = app.TestObjects.userAlice
    })

    after(async function () {
        await app.close()
    })

    function uniqueName (prefix) {
        counter++
        return `${prefix} ${counter}`
    }

    async function createSchema (props = {}) {
        return app.db.models.DataSchema.create({ name: uniqueName('schema'), TeamId: team.id, ...props })
    }

    async function createVersion (schema, props = {}) {
        return app.db.models.DataSchemaVersion.create({
            DataSchemaId: schema.id,
            schema: { type: 'object' },
            CreatedById: user.id,
            ...props
        })
    }

    async function publish (schema, version, props = {}) {
        return createVersion(schema, { status: 'published', version, PublishedById: user.id, publishedAt: new Date(), ...props })
    }

    describe('DataSchemaGroup', function () {
        it('trims the name and rejects an empty one', async function () {
            const group = await app.db.models.DataSchemaGroup.create({ name: '  Line 1  ', TeamId: team.id })
            group.name.should.equal('Line 1')
            await app.db.models.DataSchemaGroup.create({ name: '   ', TeamId: team.id }).should.be.rejected()
        })

        it('rejects a duplicate name in the same team only', async function () {
            const name = uniqueName('group')
            await app.db.models.DataSchemaGroup.create({ name, TeamId: team.id })
            await app.db.models.DataSchemaGroup.create({ name, TeamId: team.id }).should.be.rejectedWith({ name: 'SequelizeUniqueConstraintError' })
            await app.db.models.DataSchemaGroup.create({ name, TeamId: otherTeam.id })
        })

        it('lists the team groups by name with their schema count', async function () {
            const team3 = app.TestObjects.team3
            const zebra = await app.db.models.DataSchemaGroup.create({ name: 'Zebra', TeamId: team3.id })
            await app.db.models.DataSchemaGroup.create({ name: 'Alpha', TeamId: team3.id })
            await app.db.models.DataSchema.create({ name: uniqueName('schema'), TeamId: team3.id, DataSchemaGroupId: zebra.id })
            await app.db.models.DataSchema.create({ name: uniqueName('schema'), TeamId: team3.id, DataSchemaGroupId: zebra.id })

            const groups = (await app.db.models.DataSchemaGroup.forTeam(team3.id)).map(app.db.views.DataSchemaGroup.group)
            groups.map(g => [g.name, g.schemaCount]).should.eql([['Alpha', 0], ['Zebra', 2]])
            groups[1].id.should.equal(zebra.hashid)

            const found = await app.db.models.DataSchemaGroup.byId(zebra.hashid)
            found.id.should.equal(zebra.id)
            should(await app.db.models.DataSchemaGroup.byId('not-a-hashid')).be.null()
        })

        it('leaves its schemas without a group when it is deleted', async function () {
            const group = await app.db.models.DataSchemaGroup.create({ name: uniqueName('group'), TeamId: team.id })
            const schema = await createSchema({ DataSchemaGroupId: group.id })
            await group.destroy()
            await schema.reload()
            should(schema.DataSchemaGroupId).be.null()
        })
    })

    describe('DataSchema', function () {
        it('trims the name and rejects an empty one', async function () {
            const schema = await createSchema({ name: '  Temperature reading ' })
            schema.name.should.equal('Temperature reading')
            await createSchema({ name: '' }).should.be.rejected()
        })

        it('rejects a duplicate name in the same team, whatever the group', async function () {
            const name = uniqueName('schema')
            const group = await app.db.models.DataSchemaGroup.create({ name: uniqueName('group'), TeamId: team.id })
            await createSchema({ name })
            await createSchema({ name, DataSchemaGroupId: group.id }).should.be.rejectedWith({ name: 'SequelizeUniqueConstraintError' })
            await app.db.models.DataSchema.create({ name, TeamId: otherTeam.id })
        })

        it('rejects a group from another team', async function () {
            const group = await app.db.models.DataSchemaGroup.create({ name: uniqueName('group'), TeamId: otherTeam.id })
            await createSchema({ DataSchemaGroupId: group.id }).should.be.rejectedWith(/does not belong to this team/)
            const schema = await createSchema()
            schema.DataSchemaGroupId = group.id
            await schema.save().should.be.rejectedWith(/does not belong to this team/)
        })

        it('summarises the group, latest published version and draft', async function () {
            const group = await app.db.models.DataSchemaGroup.create({ name: uniqueName('group'), TeamId: team.id })
            const created = await createSchema({ description: 'A reading', DataSchemaGroupId: group.id })

            let summary = app.db.views.DataSchema.schemaSummary(await app.db.models.DataSchema.byId(created.hashid))
            summary.should.containEql({ id: created.hashid, description: 'A reading', latestVersion: null, latestPublishedAt: null, hasDraft: false })
            summary.group.should.eql({ id: group.hashid, name: group.name })

            await publish(created, '1.9.0')
            await publish(created, '1.10.0')
            await publish(created, '2.0.0', { status: 'deprecated' })
            await createVersion(created)

            summary = app.db.views.DataSchema.schemaSummary(await app.db.models.DataSchema.byId(created.id))
            summary.latestVersion.should.equal('1.10.0')
            summary.latestPublishedAt.should.be.a.String()
            summary.hasDraft.should.be.true()
        })

        it('finds a schema by name in a team', async function () {
            const created = await createSchema()
            const found = await app.db.models.DataSchema.byName(team.id, created.name)
            found.id.should.equal(created.id)
            should(await app.db.models.DataSchema.byName(otherTeam.id, created.name)).be.null()
        })

        it('lists the team schemas with search, group filter and pagination', async function () {
            const listTeam = await app.factory.createTeam({ name: 'schema-list-team' })
            const group = await app.db.models.DataSchemaGroup.create({ name: 'Energy', TeamId: listTeam.id })
            await app.db.models.DataSchema.create({ name: 'Meter reading', TeamId: listTeam.id, DataSchemaGroupId: group.id })
            await app.db.models.DataSchema.create({ name: 'Press status', description: 'meter of the press', TeamId: listTeam.id })
            await app.db.models.DataSchema.create({ name: 'Alarm', TeamId: listTeam.id })

            const all = await app.db.models.DataSchema.forTeam(listTeam.id)
            all.count.should.equal(3)
            all.schemas.map(s => s.name).should.eql(['Meter reading', 'Press status', 'Alarm'])

            const search = await app.db.models.DataSchema.forTeam(listTeam.id, { query: 'METER' })
            search.count.should.equal(2)

            const grouped = await app.db.models.DataSchema.forTeam(listTeam.id, {}, { groupId: group.id })
            grouped.schemas.map(s => s.name).should.eql(['Meter reading'])
            app.db.views.DataSchema.schemaSummary(grouped.schemas[0]).group.name.should.equal('Energy')

            const ungrouped = await app.db.models.DataSchema.forTeam(listTeam.id, {}, { groupId: null })
            ungrouped.schemas.map(s => s.name).should.eql(['Press status', 'Alarm'])

            const page1 = await app.db.models.DataSchema.forTeam(listTeam.id, { limit: 2 })
            page1.schemas.should.have.length(2)
            const page2 = await app.db.models.DataSchema.forTeam(listTeam.id, { limit: 2, cursor: page1.meta.next_cursor })
            page2.schemas.map(s => s.name).should.eql(['Alarm'])
        })

        it('deletes its versions, published ones included, when it is deleted', async function () {
            const schema = await createSchema()
            await publish(schema, '1.0.0')
            await createVersion(schema)
            await schema.destroy()
            ;(await app.db.models.DataSchemaVersion.count({ where: { DataSchemaId: schema.id } })).should.equal(0)
        })

        it('is deleted with its team', async function () {
            const doomed = await app.factory.createTeam({ name: 'schema-doomed-team' })
            const group = await app.db.models.DataSchemaGroup.create({ name: 'Doomed', TeamId: doomed.id })
            const schema = await app.db.models.DataSchema.create({ name: 'Doomed', TeamId: doomed.id, DataSchemaGroupId: group.id })
            await publish(schema, '1.0.0')
            await doomed.destroy()
            should(await app.db.models.DataSchema.findByPk(schema.id)).be.null()
            should(await app.db.models.DataSchemaGroup.findByPk(group.id)).be.null()
            ;(await app.db.models.DataSchemaVersion.count({ where: { DataSchemaId: schema.id } })).should.equal(0)
        })
    })

    describe('DataSchemaVersion', function () {
        it('stores the document as JSON and returns it as an object', async function () {
            const schema = await createSchema()
            const draft = await createVersion(schema, { schema: { type: 'object', properties: { a: { type: 'string' } } } })
            await draft.reload()
            draft.schema.should.eql({ type: 'object', properties: { a: { type: 'string' } } })
            draft.format.should.equal('json-schema-2020-12')
            draft.status.should.equal('draft')
        })

        it('does not treat the same content as a change', async function () {
            const schema = await createSchema()
            const draft = await createVersion(schema, { schema: { type: 'object' } })
            draft.schema = { type: 'object' }
            draft.changed('schema').should.be.false()
        })

        it('rejects a draft with a version', async function () {
            const schema = await createSchema()
            await createVersion(schema, { version: '1.0.0' }).should.be.rejectedWith(/draft cannot have a version/)
        })

        it('requires a valid version unless it is a draft', async function () {
            const schema = await createSchema()
            await createVersion(schema, { status: 'published' }).should.be.rejectedWith(/major.minor.patch/)
            await publish(schema, 'v1.0.0').should.be.rejectedWith(/major.minor.patch/)
            await publish(schema, '1.0').should.be.rejectedWith(/major.minor.patch/)
        })

        it('sets major, minor and patch from the version', async function () {
            const schema = await createSchema()
            const version = await publish(schema, '3.12.7')
            version.major.should.equal(3)
            version.minor.should.equal(12)
            version.patch.should.equal(7)
            const mismatched = await publish(schema, '4.0.0', { major: 9, minor: 9, patch: 9 })
            await mismatched.reload()
            mismatched.major.should.equal(4)
            mismatched.minor.should.equal(0)
            mismatched.patch.should.equal(0)
            const draft = await createVersion(schema)
            await draft.reload()
            should(draft.major).be.null()
        })

        it('allows a second draft only once the first is gone', async function () {
            const schema = await createSchema()
            const draft = await createVersion(schema)
            await createVersion(schema).should.be.rejectedWith({ name: 'SequelizeUniqueConstraintError' })
            await draft.destroy()
            await createVersion(schema)
        })

        it('rejects a duplicate version', async function () {
            const schema = await createSchema()
            await publish(schema, '1.0.0')
            await publish(schema, '1.0.0').should.be.rejectedWith({ name: 'SequelizeUniqueConstraintError' })
            await publish(schema, '1.1.0', { status: 'deprecated' })
            await publish(schema, '1.1.0').should.be.rejectedWith({ name: 'SequelizeUniqueConstraintError' })
        })

        it('publishes a draft', async function () {
            const schema = await createSchema()
            const draft = await createVersion(schema, { schema: { type: 'string' } })
            await draft.update({ status: 'published', version: '1.0.0', schema: { $id: 'urn:x', type: 'string' }, PublishedById: user.id, publishedAt: new Date() })
            await draft.reload()
            draft.status.should.equal('published')
            draft.major.should.equal(1)
        })

        for (const status of ['published', 'deprecated']) {
            describe(`a ${status} version`, function () {
                let version
                beforeEach(async function () {
                    const schema = await createSchema()
                    version = await publish(schema, '1.0.0', { status })
                })

                const changes = {
                    schema: { type: 'string' },
                    version: '1.0.1',
                    format: 'other',
                    DataSchemaId: 0,
                    PublishedById: null,
                    publishedAt: new Date(0)
                }
                for (const [field, value] of Object.entries(changes)) {
                    it(`cannot change ${field}`, async function () {
                        if (field === 'DataSchemaId') {
                            value.should.equal(0)
                            const other = await createSchema()
                            await version.update({ DataSchemaId: other.id }).should.be.rejectedWith(/Cannot change DataSchemaId/)
                            return
                        }
                        await version.update({ [field]: value }).should.be.rejectedWith(/Cannot change/)
                    })
                }

                it('cannot change through a bulk update', async function () {
                    await app.db.models.DataSchemaVersion.update({ schema: { type: 'string' } }, { where: { id: version.id } }).should.be.rejectedWith(/Cannot change schema/)
                    await version.reload()
                    version.schema.should.eql({ type: 'object' })
                })

                it('can change its notes', async function () {
                    await version.update({ notes: 'Adds the unit' })
                    await version.reload()
                    version.notes.should.equal('Adds the unit')
                })

                it('cannot be deleted', async function () {
                    await version.destroy().should.be.rejectedWith(/Cannot delete/)
                    await app.db.models.DataSchemaVersion.destroy({ where: { id: version.id } }).should.be.rejectedWith(/Cannot delete/)
                    should.exist(await app.db.models.DataSchemaVersion.findByPk(version.id))
                })

                it('cannot go back to draft', async function () {
                    await version.update({ status: 'draft', version: null }).should.be.rejectedWith(/Cannot change a/)
                })
            })
        }

        it('only changes status from draft to published, and between published and deprecated', async function () {
            const schema = await createSchema()
            const draft = await createVersion(schema)
            await draft.update({ status: 'deprecated', version: '1.0.0' }).should.be.rejectedWith(/Cannot change a draft version to deprecated/)

            const published = await publish(schema, '2.0.0')
            await published.update({ status: 'deprecated' })
            await published.reload()
            published.status.should.equal('deprecated')
            await published.update({ status: 'published' })
            await published.reload()
            published.status.should.equal('published')
        })

        it('orders versions numerically and finds the latest published one', async function () {
            const schema = await createSchema()
            should(await app.db.models.DataSchemaVersion.latestPublished(schema.id)).be.null()
            should(await app.db.models.DataSchemaVersion.byVersion(schema.id, 'latest')).be.null()

            await publish(schema, '1.9.0')
            await publish(schema, '1.10.0')
            await publish(schema, '2.0.0', { status: 'deprecated' })
            await createVersion(schema)

            ;(await app.db.models.DataSchemaVersion.latestPublished(schema.id)).version.should.equal('1.10.0')
            ;(await app.db.models.DataSchemaVersion.byVersion(schema.id, 'latest')).version.should.equal('1.10.0')
            ;(await app.db.models.DataSchemaVersion.byVersion(schema.id, '2.0.0')).status.should.equal('deprecated')
            should(await app.db.models.DataSchemaVersion.byVersion(schema.id, '3.0.0')).be.null()
            ;(await app.db.models.DataSchemaVersion.existingVersions(schema.id)).should.eql(['2.0.0', '1.10.0', '1.9.0'])

            const all = await app.db.models.DataSchemaVersion.forSchema(schema.id)
            all.map(v => v.version).should.eql([null, '2.0.0', '1.10.0', '1.9.0'])
            const published = await app.db.models.DataSchemaVersion.forSchema(schema.id, { status: 'published' })
            published.map(v => v.version).should.eql(['1.10.0', '1.9.0'])
        })

        it('renders a version with its authors', async function () {
            const schema = await createSchema()
            await publish(schema, '1.0.0', { notes: 'First' })
            const version = await app.db.models.DataSchemaVersion.byVersion(schema.id, '1.0.0')
            const view = app.db.views.DataSchemaVersion.version(version)
            view.should.containEql({ version: '1.0.0', status: 'published', notes: 'First', format: 'json-schema-2020-12', schema: { type: 'object' } })
            view.createdBy.id.should.equal(user.hashid)
            view.publishedBy.id.should.equal(user.hashid)

            const full = app.db.views.DataSchema.schema(await app.db.models.DataSchema.byId(schema.id), await app.db.models.DataSchemaVersion.forSchema(schema.id))
            full.versions.should.have.length(1)
            full.versions[0].should.not.have.property('schema')
        })
    })
})
