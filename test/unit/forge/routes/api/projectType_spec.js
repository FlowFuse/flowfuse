const should = require('should') // eslint-disable-line
const setup = require('../setup')

describe('Project Type API', function () {
    let app
    const TestObjects = {}
    beforeEach(async function () {
        app = await setup()

        // Alice create in setup()
        TestObjects.alice = await app.db.models.User.byUsername('alice')
        TestObjects.bob = await app.db.models.User.create({ username: 'bob', name: 'Bob Solo', email: 'bob@example.com', email_verified: true, password: 'bbPassword' })
        TestObjects.stack1 = await app.db.models.ProjectStack.byId(app.stack.id)
        TestObjects.tokens = {}
        TestObjects.projectType1 = app.projectType
        await login('alice', 'aaPassword')
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

    afterEach(async function () {
        await app.close()
    })

    describe('Create Project Type', async function () {
        // POST /api/v1/project-types
        // - Must be admin or team owner/member
        it('Create a simple project type', async function () {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/project-types',
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    name: 'project-type-2',
                    description: 'another-project-type',
                    active: true,
                    order: 2,
                    properties: {
                        foo: 'bar'
                    }
                }
            })
            const result = response.json()
            result.should.have.property('id')
            result.should.have.property('name', 'project-type-2')
            result.should.have.property('active', true)
            result.should.have.property('description', 'another-project-type')
            result.should.have.property('projectCount', 0)
            result.should.have.property('stackCount', 0)
            result.should.have.property('properties')
            result.should.have.property('defaultStack', null)
            result.properties.should.have.property('foo', 'bar')
        })
        it('Ensure project type name is unique', async function () {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/project-types',
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    name: 'projectType1' // projectType1 created in setup
                }
            })
            response.statusCode.should.equal(400)
            response.json().should.have.property('error')
        })
    })

    describe('Update project type', async function () {
        async function updateProjectType (id, payload, token = TestObjects.tokens.alice) {
            return app.inject({
                method: 'PUT',
                url: `/api/v1/project-types/${id}`,
                cookies: { sid: token },
                payload
            })
        }
        async function denyUpdate (id, payload, token, expectedStatus = 400) {
            const response = await updateProjectType(id, payload, token)
            response.statusCode.should.equal(expectedStatus)
            const result = response.json()
            result.should.have.property('error')
            return result
        }
        async function allowUpdate (id, payload) {
            const response = await updateProjectType(id, payload)
            response.statusCode.should.equal(200)
            return response.json()
        }

        it('Prevents updates of project-type.property for in-use types', async function () {
            await denyUpdate(TestObjects.projectType1.hashid, {
                properties: { foo: 'not-allowed' }
            })
        })
        it('Allows partial update of in-use types', async function () {
            const result = await allowUpdate(TestObjects.projectType1.hashid, {
                name: 'project-type-updated',
                description: 'updated',
                active: false,
                order: 7
            })
            result.should.have.property('name', 'project-type-updated')
            result.should.have.property('description', 'updated')
            result.should.have.property('active', false)
            result.should.have.property('order', 7)
            result.should.have.property('properties')
            result.properties.should.have.property('foo', 'bar')
        })

        it('Allows updates of project-type for unused types', async function () {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/project-types',
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    name: 'project-type-2',
                    description: 'another-project-type',
                    active: true,
                    order: 2,
                    properties: {
                        foo: 'bar'
                    }
                }
            })
            const unusedProjectType = response.json()
            const result = await allowUpdate(unusedProjectType.id, {
                name: 'project-type-updated',
                description: 'updated',
                active: false,
                order: 7,
                properties: {
                    foo: 'new',
                    color: 'blue'
                }
            })
            result.should.have.property('name', 'project-type-updated')
            result.should.have.property('description', 'updated')
            result.should.have.property('active', false)
            result.should.have.property('order', 7)
            result.should.have.property('properties')
            result.properties.should.have.property('foo', 'new')
            result.properties.should.have.property('color', 'blue')
        })

        it('Prevents non-admin from editing the project-type', async function () {
            // Bob (non-admin)
            await denyUpdate(TestObjects.projectType1.hashid, {
                name: 'not-allowed'
            }, TestObjects.tokens.bob, 403)
        })

        it('Prevents duplicate project-type name', async function () {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/project-types',
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    name: 'project-type-2',
                    description: 'another-project-type',
                    active: true,
                    order: 2,
                    properties: {
                        foo: 'bar'
                    }
                }
            })
            const unusedProjectType = response.json()
            const errorResponse = await denyUpdate(unusedProjectType.id, {
                name: 'projectType1'
            })

            errorResponse.should.have.property('error', 'name must be unique')
        })
    })

    describe('Delete project-type', async function () {
        it('Prevents admin from deleting a used project-type', async function () {
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/project-types/${TestObjects.projectType1.hashid}`,
                cookies: { sid: TestObjects.tokens.bob }
            })
            response.statusCode.should.equal(403)
        })
        it('Allows admin to delete an unused project-type', async function () {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/project-types',
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    name: 'project-type-2',
                    description: 'another-project-type',
                    active: true,
                    order: 2,
                    properties: {
                        foo: 'bar'
                    }
                }
            })
            const unusedProjectType = response.json()
            const deleteResponse = await app.inject({
                method: 'DELETE',
                url: `/api/v1/project-types/${unusedProjectType.id}`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            deleteResponse.statusCode.should.equal(200)
        })
    })

    describe('List project-types', async function () {
        beforeEach(async function () {
            await app.inject({
                method: 'POST',
                url: '/api/v1/project-types',
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    name: 'pt2',
                    active: false,
                    properties: {}
                }
            })
            await app.inject({
                method: 'POST',
                url: '/api/v1/project-types',
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    name: 'pt3',
                    active: true,
                    properties: {}
                }
            })
        })

        it('only lists active project-types by default', async function () {
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/project-types',
                cookies: { sid: TestObjects.tokens.bob }
            })
            const result = response.json()
            result.should.have.property('types')
            result.types.should.have.length(2)
            result.types[0].should.have.property('name', 'projectType1')
            result.types[1].should.have.property('name', 'pt3')
        })

        it('lists all types if requested', async function () {
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/project-types',
                query: { filter: 'all' },
                cookies: { sid: TestObjects.tokens.bob }
            })
            const result = response.json()
            result.should.have.property('types')
            result.types.should.have.length(3)
            result.types[0].should.have.property('name', 'projectType1')
            result.types[1].should.have.property('name', 'pt2')
            result.types[2].should.have.property('name', 'pt3')
        })
    })
})
