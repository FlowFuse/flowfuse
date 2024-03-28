const should = require('should') // eslint-disable-line
const sinon = require('sinon')

const TestModelFactory = require('../../../../../lib/TestModelFactory.js')

const setup = require('../../setup.js')

describe('Flow Blueprints API', function () {
    const sandbox = sinon.createSandbox()

    const TestObjects = {
        tokens: {},
        team: null,
        instance: null,
        team2: null,
        instance2: null,
        /** @type {TestModelFactory} */
        factory: null
    }

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
        TestObjects.team = app.team
        TestObjects.instance = app.instance
        TestObjects.stack = app.stack
        TestObjects.template = app.template
        TestObjects.projectType = app.projectType
        TestObjects.application = app.application
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

    async function updateBlueprint (id, body, token) {
        const response = await app.inject({
            method: 'PUT',
            url: `/api/v1/flow-blueprints/${id}`,
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
                flows: { flows: [] },
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
                flows: { flows: [] },
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

        it('Availability is null by default (available to all team types)', async function () {
            const [statusCode, resp] = await createBlueprint({ name: generateName('bp') }, TestObjects.tokens.alice)
            statusCode.should.equal(200)
            const bp1 = await app.db.models.FlowTemplate.byId(resp.id)
            bp1.should.have.property('teamTypeScope', null)
        })
        it('Availability is set to empty array', async function () {
            const [statusCode, resp] = await createBlueprint({ name: generateName('bp'), teamTypeScope: [] }, TestObjects.tokens.alice)
            statusCode.should.equal(200)
            const bp1 = await app.db.models.FlowTemplate.byId(resp.id)
            bp1.should.have.property('teamTypeScope').and.be.an.Array().and.have.length(0)
        })
        it('Availability is set to an array of team types', async function () {
            const [statusCode, resp] = await createBlueprint({ name: generateName('bp'), teamTypeScope: [TestObjects.team.TeamType.hashid] }, TestObjects.tokens.alice)
            statusCode.should.equal(200)
            const bp1 = await app.db.models.FlowTemplate.byId(resp.id)
            bp1.should.have.property('teamTypeScope').and.be.an.Array().and.have.length(1)
            bp1.teamTypeScope[0].should.equal(TestObjects.team.TeamType.id) // note id not hashid
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
        describe('Blueprint availability', function () {
            before(async function () {
                // create a 2nd team type tier, project type and stack
                const teamType2 = await TestObjects.factory.createTeamType({
                    name: 'enterprise'
                })
                const projectType2 = await TestObjects.factory.createProjectType({ name: 'type2' })
                const stack2 = await TestObjects.factory.createStack({ name: 'stack1-for-type2' }, projectType2)

                // Create a 2nd team, application and instance
                TestObjects.team2 = await TestObjects.factory.createTeam({ name: 'EnterpriseTeam', TeamTypeId: teamType2.id })
                TestObjects.application2 = await TestObjects.factory.createApplication({ name: 'EnterpriseApp' }, TestObjects.team2)
                TestObjects.instance2 = await TestObjects.factory.createInstance(
                    { name: 'EnterpriseInstance' },
                    TestObjects.application2,
                    stack2,
                    TestObjects.template,
                    projectType2,
                    { start: false }
                )

                // Remove anything created by other tests so we have a clean slate
                await app.db.models.FlowTemplate.destroy({ where: {} })

                await createBlueprint({
                    name: 'default-availability',
                    active: true,
                    teamTypeScope: null // All team types
                }, TestObjects.tokens.alice)

                await createBlueprint({
                    name: 'none-available',
                    active: true,
                    teamTypeScope: [] // No team types
                }, TestObjects.tokens.alice)

                await createBlueprint({
                    name: 'starter-tier-only',
                    active: true,
                    teamTypeScope: [TestObjects.team.TeamType.hashid] // Only available to the default team type
                }, TestObjects.tokens.alice)

                await createBlueprint({
                    name: 'enterprise-tier-only',
                    active: true,
                    teamTypeScope: [TestObjects.team2.TeamType.hashid] // Only available to the 2nd project type
                }, TestObjects.tokens.alice)

                await createBlueprint({
                    name: 'all-selected',
                    active: true,
                    teamTypeScope: [TestObjects.team.TeamType.hashid, TestObjects.team2.TeamType.hashid] // Available to both team types
                }, TestObjects.tokens.alice)
            })
            it('Lists blueprints available to a starter tier', async function () {
                const response = await app.inject({
                    method: 'GET',
                    url: '/api/v1/flow-blueprints?filter=all&team=' + TestObjects.team.hashid, // starter team
                    cookies: { sid: TestObjects.tokens.bob }
                })
                const result = response.json()
                result.should.have.property('count', 3)
                result.blueprints.map(b => b.name).should.containDeep([
                    'default-availability',
                    'starter-tier-only',
                    'all-selected'
                ])
            })
            it('Lists blueprints available to an enterprise tier', async function () {
                const response = await app.inject({
                    method: 'GET',
                    url: '/api/v1/flow-blueprints?filter=all&team=' + TestObjects.team2.hashid, // the enterprise team
                    cookies: { sid: TestObjects.tokens.bob }
                })
                const result = response.json()
                result.should.have.property('count', 3)
                result.blueprints.map(b => b.name).should.containDeep([
                    'default-availability',
                    'enterprise-tier-only',
                    'all-selected'
                ])
            })
        })
    })

    describe('Update Flow Template', function () {
        it('Admin can update a flow blueprint', async function () {
            const name = generateName('flow blueprint')
            const [statusCode, result] = await createBlueprint({ name }, TestObjects.tokens.alice)
            statusCode.should.equal(200)
            const blueprintId = result.id
            const [updateStatusCode, template] = await updateBlueprint(blueprintId, {
                description: 'new desc',
                active: false,
                category: 'new cat',
                flows: { flows: [1, 2, 3] },
                modules: { a: 1 }
            }, TestObjects.tokens.alice)
            updateStatusCode.should.equal(200)

            template.should.have.property('id', blueprintId)
            template.should.have.property('name', name)
            template.should.have.property('description', 'new desc')
            template.should.have.property('active', false)
            template.should.have.property('category', 'new cat')
            // Response is summary view without these properties
            template.should.not.have.property('flows')
            template.should.not.have.property('modules')

            const fullTemplate = (await app.inject({
                method: 'GET',
                url: `/api/v1/flow-blueprints/${blueprintId}`,
                cookies: { sid: TestObjects.tokens.alice }
            })).json()

            fullTemplate.should.have.property('flows')
            fullTemplate.should.have.property('modules')
        })

        it('Non-admin cannot update a flow blueprint', async function () {
            const name = generateName('flow blueprint')
            const [statusCode, result] = await createBlueprint({ name }, TestObjects.tokens.alice)
            statusCode.should.equal(200)
            const blueprintId = result.id

            const [updateStatusCode] = await updateBlueprint(blueprintId, {
                description: 'new desc',
                active: false,
                category: 'new cat',
                flows: { flows: [1, 2, 3] },
                modules: { a: 1 }
            }, TestObjects.tokens.bob)
            updateStatusCode.should.equal(403)
        })

        it('Invalid flow format is rejected', async function () {
            const name = generateName('flow blueprint')
            const [statusCode, result] = await createBlueprint({ name }, TestObjects.tokens.alice)
            statusCode.should.equal(200)
            const blueprintId = result.id

            // flows.flows not present
            const [statusCode1, resp1] = await updateBlueprint(blueprintId, { flows: {} }, TestObjects.tokens.alice)
            resp1.should.have.property('code', 'unexpected_error')
            statusCode1.should.equal(400)

            // flows.flows not an array
            const [statusCode2, resp2] = await updateBlueprint(blueprintId, { flows: { flows: true } }, TestObjects.tokens.alice)
            statusCode2.should.equal(400)
            resp2.should.have.property('code', 'unexpected_error')

            // flows.flows not an array
            const [statusCode3, resp3] = await updateBlueprint(blueprintId, { flows: { flows: {} } }, TestObjects.tokens.alice)
            statusCode3.should.equal(400)
            resp3.should.have.property('code', 'unexpected_error')

            // Flows property not an object
            const [statusCode4] = await updateBlueprint(blueprintId, { flows: 'invalid' }, TestObjects.tokens.alice)
            statusCode4.should.equal(400)

            // Credentials set to array
            const [statusCode5, resp5] = await updateBlueprint(blueprintId, { flows: { flows: [], credentials: [] } }, TestObjects.tokens.alice)
            resp5.should.have.property('code', 'unexpected_error')
            statusCode5.should.equal(400)

            // Credentials appears to include encrypted values
            const [statusCode6, resp6] = await updateBlueprint(blueprintId, { flows: { flows: [], credentials: { $: 'foo' } } }, TestObjects.tokens.alice)
            resp6.should.have.property('code', 'unexpected_error')
            statusCode6.should.equal(400)
        })
        it('Updates availability', async function () {
            const name = generateName('flow blueprint with availability')
            const teamTypeScope = [] // start with no teamTypeScope
            const [statusCode, result] = await createBlueprint({ name, teamTypeScope }, TestObjects.tokens.alice)
            statusCode.should.equal(200)
            const blueprintId = result.id

            // read from DB and confirm teamTypeScope is an empty array
            const resp1 = await app.inject({
                method: 'GET',
                url: `/api/v1/flow-blueprints/${blueprintId}`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            resp1.statusCode.should.equal(200)
            const resp1Json = resp1.json()
            resp1Json.should.have.property('teamTypeScope')
            resp1Json.teamTypeScope.should.be.an.Array().and.have.length(0)

            // update it with new teamTypeScope
            const team1Availability = [TestObjects.team.TeamType.hashid]
            const [statusCode1] = await updateBlueprint(blueprintId, { teamTypeScope: team1Availability }, TestObjects.tokens.alice)
            statusCode1.should.equal(200)

            // read from DB and confirm teamTypeScope is now the new value
            const resp2 = await app.inject({
                method: 'GET',
                url: `/api/v1/flow-blueprints/${blueprintId}`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            resp2.statusCode.should.equal(200)
            const resp2Json = resp2.json()
            resp2Json.should.have.property('teamTypeScope')
            resp2Json.teamTypeScope.should.be.an.Array().and.have.length(1)
            resp2Json.teamTypeScope[0].should.equal(TestObjects.team.TeamType.hashid)
        })
        it('Discards invalid team types', async function () {
            const name = generateName('flow blueprint with teamTypeScope 2')
            const teamTypeScope = null // start all teamTypeScope (null)
            const [statusCode, result] = await createBlueprint({ name, teamTypeScope }, TestObjects.tokens.alice)
            statusCode.should.equal(200)
            const blueprintId = result.id

            // read from DB and confirm teamTypeScope is null
            const resp1 = await app.inject({
                method: 'GET',
                url: `/api/v1/flow-blueprints/${blueprintId}`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            resp1.statusCode.should.equal(200)
            const resp1Json = resp1.json()
            resp1Json.should.have.property('teamTypeScope').and.equal(null)

            // update it with new teamTypeScope, 1 good and 2 bad team types
            const team1Availability = [TestObjects.team.TeamType.hashid, 'bad1', 'bad2']
            const [statusCode1] = await updateBlueprint(blueprintId, { teamTypeScope: team1Availability }, TestObjects.tokens.alice)
            statusCode1.should.equal(200)

            // read from DB and confirm teamTypeScope is now the new value
            const resp2 = await app.inject({
                method: 'GET',
                url: `/api/v1/flow-blueprints/${blueprintId}`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            resp2.statusCode.should.equal(200)
            const resp2Json = resp2.json()
            resp2Json.should.have.property('teamTypeScope')
            resp2Json.teamTypeScope.should.be.an.Array().and.have.length(1)
            resp2Json.teamTypeScope[0].should.equal(TestObjects.team.TeamType.hashid)
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
