const should = require('should') // eslint-disable-line
const sinon = require('sinon')

const TestModelFactory = require('../../../../../lib/TestModelFactory.js')

const setup = require('../../setup.js')

describe('Flow Blueprints API', function () {
    const sandbox = sinon.createSandbox()

    const TestObjects = { tokens: {} }

    let app

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
        app = await setup()
        sandbox.stub(app.log, 'info')
        sandbox.stub(app.log, 'warn')
        sandbox.stub(app.log, 'error')

        const factory = new TestModelFactory(app)

        TestObjects.factory = factory

        // Admin User
        TestObjects.alice = app.user
        // Non-admin User
        TestObjects.bob = await app.db.models.User.create({ username: 'bob', name: 'Bob Solo', email: 'bob@example.com', email_verified: true, password: 'bbPassword' })
        await login('alice', 'aaPassword')
        await login('bob', 'bbPassword')
    })

    after(async function () {
        await app.close()
        sandbox.restore()
    })

    async function createBlueprint (body, token) {
        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/flow-blueprints',
            body,
            cookies: { sid: token }
        })
        return [response.statusCode, response.json()]
    }

    let objectCount = 0
    const generateName = (prefix = 'object') => `${prefix}-${objectCount++}`

    describe('Create Flow Blueprints', function () {
        it('Admin can create a flow blueprint', async function () {
            const name = generateName('flow blueprint')
            const [statusCode, result] = await createBlueprint({
                name,
                description: 'a flow',
                active: true,
                category: 'starter',
                flows: {},
                modules: {}
            }, TestObjects.tokens.alice)
            statusCode.should.equal(200)
            result.should.have.property('id')
            result.should.have.property('name', name)
            // Response is a summary object that doesn't include flows/modules
            result.should.not.have.property('flows')
            result.should.not.have.property('modules')
        })

        it('Non-admin cannot create a flow blueprint', async function () {
            const [statusCode] = await createBlueprint({
                name: generateName('flow blueprint'),
                description: 'a flow',
                active: true,
                category: 'starter',
                flows: {},
                modules: {}
            }, TestObjects.tokens.bob)
            statusCode.should.equal(403)
        })

        it('Invalid flow format is rejected', async function () {
            // flows.flows not present
            const [statusCode1, resp1] = await createBlueprint({ name: generateName('bp'), flows: {} }, TestObjects.tokens.alice)
            resp1.should.have.property('code', 'unexpected_error')
            statusCode1.should.equal(400)

            // flows.flows not an array
            const [statusCode2, resp2] = await createBlueprint({ name: generateName('bp'), flows: { flows: true } }, TestObjects.tokens.alice)
            statusCode2.should.equal(400)
            resp2.should.have.property('code', 'unexpected_error')

            // flows.flows not an array
            const [statusCode3, resp3] = await createBlueprint({ name: generateName('bp'), flows: { flows: {} } }, TestObjects.tokens.alice)
            statusCode3.should.equal(400)
            resp3.should.have.property('code', 'unexpected_error')

            // Flows property not an object
            const [statusCode4] = await createBlueprint({ name: generateName('bp'), flows: 'invalid' }, TestObjects.tokens.alice)
            statusCode4.should.equal(400)

            // Credentials set to array
            const [statusCode5, resp5] = await createBlueprint({ name: generateName('bp'), flows: { flows: [], credentials: [] } }, TestObjects.tokens.alice)
            resp5.should.have.property('code', 'unexpected_error')
            statusCode5.should.equal(400)

            // Credentials appears to include encrypted values
            const [statusCode6, resp6] = await createBlueprint({ name: generateName('bp'), flows: { flows: [], credentials: { $: 'foo' } } }, TestObjects.tokens.alice)
            resp6.should.have.property('code', 'unexpected_error')
            statusCode6.should.equal(400)
        })

        it('Invalid modules format is rejected', async function () {
            // modules not an object
            const [statusCode1] = await createBlueprint({ name: generateName('bp'), modules: [] }, TestObjects.tokens.alice)
            statusCode1.should.equal(400)
        })
    })

    describe('Get Flow Template', function () {
        it('User can get flow blueprint details', async function () {
            const name = generateName('flow blueprint')
            const description = generateName('a flow blueprint description')
            const [statusCode, result] = await createBlueprint({
                name,
                description,
                active: true,
                category: 'starter',
                flows: { flows: [1, 2, 3], credentials: {} },
                modules: { a: 1 }
            }, TestObjects.tokens.alice)
            statusCode.should.equal(200)

            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/flow-blueprints/${result.id}`,
                cookies: { sid: TestObjects.tokens.bob }
            })
            response.should.have.property('statusCode', 200)
            const template = response.json()

            template.should.have.property('id', result.id)
            template.should.have.property('name', name)
            template.should.have.property('description', description)

            template.should.have.property('flows')
            template.should.have.property('modules')
        })
    })

    describe('List Flow Blueprints', function () {
        before(async function () {
            // Clean up anything created by other tests so we have a known base line
            await app.db.models.FlowTemplate.destroy({ where: {} })

            for (let i = 0; i < 10; i++) {
                await createBlueprint({
                    name: 'flowBlueprint-' + i,
                    // Only mark even-numbered blueprints as active
                    active: (i % 2) === 0
                }, TestObjects.tokens.alice)
            }
        })

        it('Lists all active blueprints by default', async function () {
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/flow-blueprints',
                cookies: { sid: TestObjects.tokens.bob }
            })
            const result = response.json()

            result.should.have.property('count', 5)
            const incorrectTemplates = result.blueprints.filter(template => {
                // Get the number from the name ('flowBlueprint-X')
                const index = parseInt(template.name.split('-')[1])
                // Only even-number blueprints are active - return any that add odd
                return (index % 2) !== 0
            })
            incorrectTemplates.should.have.length(0)
        })

        it('Lists all blueprints when filter set to all', async function () {
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/flow-blueprints?filter=all',
                cookies: { sid: TestObjects.tokens.bob }
            })
            const result = response.json()

            result.should.have.property('count', 10)
        })
    })

    describe('Update Flow Template', function () {
        it('Admin can update a flow blueprint', async function () {
            const name = generateName('flow blueprint')
            const [statusCode, result] = await createBlueprint({ name }, TestObjects.tokens.alice)
            statusCode.should.equal(200)
            const templateId = result.id

            const response = await app.inject({
                method: 'PUT',
                body: {
                    description: 'new desc',
                    active: false,
                    category: 'new cat',
                    flows: { flows: [1, 2, 3] },
                    modules: { a: 1 }
                },
                url: `/api/v1/flow-blueprints/${templateId}`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)
            const template = response.json()

            template.should.have.property('id', templateId)
            template.should.have.property('name', name)
            template.should.have.property('description', 'new desc')
            template.should.have.property('active', false)
            template.should.have.property('category', 'new cat')
            // Response is summary view without these properties
            template.should.not.have.property('flows')
            template.should.not.have.property('modules')

            const fullTemplate = (await app.inject({
                method: 'GET',
                url: `/api/v1/flow-blueprints/${templateId}`,
                cookies: { sid: TestObjects.tokens.alice }
            })).json()

            fullTemplate.should.have.property('flows')
            fullTemplate.should.have.property('modules')
        })

        it('Non-admin cannot update a flow blueprint', async function () {
            const name = generateName('flow blueprint')
            const [statusCode, result] = await createBlueprint({ name }, TestObjects.tokens.alice)
            statusCode.should.equal(200)
            const templateId = result.id

            const response = await app.inject({
                method: 'PUT',
                body: {
                    description: 'new desc',
                    active: false,
                    category: 'new cat',
                    flows: { flows: [1, 2, 3] },
                    modules: { a: 1 }
                },
                url: `/api/v1/flow-blueprints/${templateId}`,
                cookies: { sid: TestObjects.tokens.bob }
            })
            response.statusCode.should.equal(403)
        })
    })

    describe('Delete Flow Blueprints', function () {
        it('Admin can delete a flow blueprint', async function () {
            const [statusCode, result] = await createBlueprint({
                name: generateName('flow blueprint')
            }, TestObjects.tokens.alice)
            statusCode.should.equal(200)

            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/flow-blueprints/${result.id}`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.should.have.property('statusCode', 200)
        })

        it('Non-admin cannot create a flow blueprint', async function () {
            const [statusCode, result] = await createBlueprint({
                name: generateName('flow blueprint')
            }, TestObjects.tokens.alice)
            statusCode.should.equal(200)

            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/flow-blueprints/${result.id}`,
                cookies: { sid: TestObjects.tokens.bob }
            })
            response.should.have.property('statusCode', 403)
        })
    })
})
