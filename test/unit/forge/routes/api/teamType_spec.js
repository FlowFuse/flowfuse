const { Op } = require('sequelize')
const should = require('should') // eslint-disable-line
const setup = require('../setup')

describe('Team Type API', function () {
    let instanceCount = 0
    const generateName = () => 'test-team-type-' + (instanceCount++)

    let app
    const TestObjects = { tokens: {} }
    before(async function () {
        app = await setup()

        // Alice create in setup()
        TestObjects.alice = await app.db.models.User.byUsername('alice')
        await login('alice', 'aaPassword')
        TestObjects.bob = await app.db.models.User.create({ username: 'bob', name: 'Bob Solo', email: 'bob@example.com', email_verified: true, password: 'bbPassword' })
        await login('bob', 'bbPassword')
    })

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

    after(async function () {
        await app.close()
    })

    describe('Default Team Type', async function () {
        it('A default team type exists', async function () {
            const defaultTeamType = await app.db.models.TeamType.findOne({ where: { id: 1 } })
            should.exist(defaultTeamType)

            defaultTeamType.properties.should.have.property('instances')
            defaultTeamType.properties.should.have.property('users')
            defaultTeamType.properties.should.have.property('devices')
            defaultTeamType.properties.should.have.property('features')
        })
    })
    describe('Create Team Type', async function () {
        // POST /api/v1/team-types
        // - Must be admin
        it('Create a team type', async function () {
            const name = generateName()
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/team-types',
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    name,
                    description: 'another-team-type',
                    active: true,
                    order: 2,
                    properties: {
                        foo: 'bar'
                    }
                }
            })
            const result = response.json()
            result.should.have.property('id')
            result.should.have.property('name', name)
            result.should.have.property('active', true)
            result.should.have.property('description', 'another-team-type')
            result.should.have.property('properties')
            result.properties.should.have.property('foo', 'bar')
        })
        it('Non-admin cannot create a team type', async function () {
            const name = generateName()
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/team-types',
                cookies: { sid: TestObjects.tokens.bob },
                payload: {
                    name,
                    description: 'another-team-type',
                    active: true,
                    order: 2,
                    properties: {
                        foo: 'bar'
                    }
                }
            })
            response.statusCode.should.equal(403)
        })
    })

    describe('Update team type', async function () {
        async function updateTeamType (id, payload, token = TestObjects.tokens.alice) {
            return app.inject({
                method: 'PUT',
                url: `/api/v1/team-types/${id}`,
                cookies: { sid: token },
                payload
            })
        }
        async function denyUpdate (id, payload, token, expectedStatus = 400) {
            const response = await updateTeamType(id, payload, token)
            response.statusCode.should.equal(expectedStatus)
            const result = response.json()
            result.should.have.property('error')
            return result
        }
        async function allowUpdate (id, payload) {
            const response = await updateTeamType(id, payload)
            response.statusCode.should.equal(200)
            return response.json()
        }

        // TODO: this test (copied from projectTypes_spec) needs updating to
        // reflect whatever property-protection is needed for the new teamType
        // model.
        it.skip('TODO: Prevents updates of team-type.property for in-use types', async function () {
            await denyUpdate(app.defaultTeamType.hashid, {
                properties: { foo: 'not-allowed' }
            })
        })

        it('Allows partial update of in-use types', async function () {
            const result = await allowUpdate(app.defaultTeamType.hashid, {
                name: 'team-type-updated-2',
                description: 'updated',
                active: false,
                order: 7
            })
            result.should.have.property('name', 'team-type-updated-2')
            result.should.have.property('description', 'updated')
            result.should.have.property('active', false)
            result.should.have.property('order', 7)
            result.should.have.property('properties')
            result.properties.should.have.property('users')
            result.properties.should.have.property('instances')
            result.properties.should.have.property('features')
            result.properties.should.have.property('devices')

            // Reset back to defaults
            await allowUpdate(app.defaultTeamType.hashid, {
                name: 'starter',
                active: true
            })
        })

        it('Allows updates of team-type for unused types', async function () {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/team-types',
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    name: generateName(),
                    description: 'another-team-type',
                    active: true,
                    order: 2,
                    properties: {
                        foo: 'bar'
                    }
                }
            })
            response.statusCode.should.equal(200)
            const unusedProjectType = response.json()
            const result = await allowUpdate(unusedProjectType.id, {
                name: 'team-type-updated',
                description: 'updated',
                active: false,
                order: 7,
                properties: {
                    foo: 'new',
                    color: 'blue'
                }
            })
            result.should.have.property('name', 'team-type-updated')
            result.should.have.property('description', 'updated')
            result.should.have.property('active', false)
            result.should.have.property('order', 7)
            result.should.have.property('properties')
            result.properties.should.have.property('foo', 'new')
            result.properties.should.have.property('color', 'blue')
        })

        it('Prevents non-admin from editing the team-type', async function () {
            // Bob (non-admin)
            await denyUpdate(app.defaultTeamType.hashid, {
                name: 'not-allowed'
            }, TestObjects.tokens.bob, 403)
        })
    })

    describe('Delete team-type', async function () {
        it('Prevents admin from deleting a used team-type', async function () {
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/team-types/${app.defaultTeamType.hashid}`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(400)
        })
        it('Allows admin to delete an unused team-type', async function () {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/team-types',
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    name: generateName(),
                    description: 'another-team-type',
                    active: true,
                    order: 2,
                    properties: {
                        foo: 'bar'
                    }
                }
            })
            const unusedTeamType = response.json()
            const deleteResponse = await app.inject({
                method: 'DELETE',
                url: `/api/v1/team-types/${unusedTeamType.id}`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            deleteResponse.statusCode.should.equal(200)
        })
    })

    describe('List team types', async function () {
        beforeEach(async function () {
            await app.db.models.TeamType.destroy({ where: { id: { [Op.gt]: 1 } } })
            const r1 = await app.inject({
                method: 'POST',
                url: '/api/v1/team-types',
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    name: 'tt2',
                    active: false,
                    properties: {}
                }
            })
            r1.statusCode.should.equal(200)
            const r2 = await app.inject({
                method: 'POST',
                url: '/api/v1/team-types',
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    name: 'tt3',
                    active: true,
                    properties: {}
                }
            })
            r2.statusCode.should.equal(200)
        })

        it('only lists active team-types by default', async function () {
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/team-types',
                cookies: { sid: TestObjects.tokens.bob }
            })
            const result = response.json()
            result.should.have.property('types')
            result.types.should.have.length(2)
            result.types[0].should.have.property('name', 'starter')
            result.types[1].should.have.property('name', 'tt3')
        })

        it('lists all types if requested', async function () {
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/team-types',
                query: { filter: 'all' },
                cookies: { sid: TestObjects.tokens.bob }
            })
            const result = response.json()
            result.should.have.property('types')
            result.types.should.have.length(3)
            result.types[0].should.have.property('name', 'starter')
            result.types[1].should.have.property('name', 'tt2')
            result.types[2].should.have.property('name', 'tt3')
        })
    })
})
