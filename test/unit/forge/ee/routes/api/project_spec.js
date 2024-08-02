const sleep = require('util').promisify(setTimeout)

const should = require('should')
const sinon = require('sinon')

const setup = require('../../setup')

const FF_UTIL = require('flowforge-test-utils')

const { START_DELAY, STOP_DELAY } = FF_UTIL.require('forge/containers/stub/index.js')

const { Roles } = FF_UTIL.require('forge/lib/roles')

describe('Projects API - with billing enabled', function () {
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

    beforeEach(async function () {
        app = await setup()
        sandbox.stub(app.log, 'info')
        sandbox.stub(app.log, 'warn')
        sandbox.stub(app.log, 'error')
        sandbox.stub(app.billing, 'addProject')
        sandbox.stub(app.billing, 'removeProject')

        await login('alice', 'aaPassword')
    })

    afterEach(async function () {
        await app.close()
        delete require.cache[require.resolve('stripe')]
        sandbox.restore()
    })

    describe('Update Project', function () {
        describe('Change project type', function () {
            it('Removes and re-adds the project to billing', async function () {
                const project = app.project

                // Create a new project type
                const projectTypeProperties = {
                    name: 'projectType-new',
                    description: 'This is a new project type',
                    active: true,
                    properties: { bar: 'foo' }
                }
                const projectType = await app.db.models.ProjectType.create(projectTypeProperties)

                // Create a new stack
                const stackProperties = {
                    name: 'stack-new',
                    active: true,
                    properties: { nodered: '9.9.9' }
                }
                const stack = await app.db.models.ProjectStack.create(stackProperties)
                await stack.setProjectType(projectType)

                // Put project in running state
                await app.containers.start(project)
                app.billing.addProject.resetHistory()
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/projects/${app.project.id}`,
                    payload: {
                        projectType: projectType.hashid,
                        stack: stack.hashid
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(200)

                await sleep(START_DELAY + STOP_DELAY + 100)

                should.equal(app.billing.removeProject.calledOnce, true)
                should.equal(app.billing.addProject.calledOnce, true)
            })
        })

        describe('Change project stack', function () {
            it('Skips removing the project from billing when changing only stack but marks billing state as billed', async function () {
                const project = app.project

                // Create a new stack
                const stackProperties = {
                    name: 'stack-new',
                    active: true,
                    properties: { nodered: '9.9.9' }
                }
                const stack = await app.db.models.ProjectStack.create(stackProperties)
                await stack.setProjectType(app.projectType)

                // Put project in running state
                await app.containers.start(project)
                app.billing.addProject.resetHistory()

                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/projects/${app.project.id}`,
                    payload: {
                        stack: stack.hashid
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })

                response.statusCode.should.equal(200)

                await sleep(STOP_DELAY + 50)

                await sleep(START_DELAY + 50)

                should.equal(app.billing.removeProject.calledOnce, false) // skipped
                should.equal(app.billing.addProject.calledOnce, true)
            })
        })
    })
})
describe('npmrc values should be hidden from none owners', function () {
    const TestObjects = {}

    let app
    const sandbox = sinon.createSandbox()

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
        sandbox.stub(app.billing, 'addProject')
        sandbox.stub(app.billing, 'removeProject')

        TestObjects.alice = await app.db.models.User.byUsername('alice')
        TestObjects.bob = await app.db.models.User.create({ username: 'bob', name: 'Bob Solo', email: 'bob@example.com', email_verified: true, password: 'bbPassword' })
        TestObjects.chris = await app.db.models.User.create({ username: 'chris', name: 'Chris Kenobi', email: 'chris@example.com', email_verified: true, password: 'ccPassword' })

        // ATeam create in setup()
        TestObjects.ATeam = await app.db.models.Team.byName('ATeam')

        TestObjects.ApplicationA = app.application

        await TestObjects.ATeam.addUser(TestObjects.bob, { through: { role: Roles.Member } })

        TestObjects.tokens = {}
        await login('alice', 'aaPassword')
        await login('bob', 'bbPassword')
        await login('chris', 'ccPassword')

        // TestObjects.tokens.alice = (await app.db.controllers.AccessToken.createTokenForPasswordReset(TestObjects.alice)).token
        TestObjects.tokens.project = (await app.project.refreshAuthTokens()).token

        TestObjects.projectType1 = app.projectType
        TestObjects.stack1 = app.stack

        const props = TestObjects.ATeam.TeamType.properties
        props.features.customCatalogs = true
        TestObjects.ATeam.TeamType.properties = props
        await TestObjects.ATeam.TeamType.save()

        const unlockedTemplate = await app.factory.createProjectTemplate(
            {
                name: 'startTemplate',
                settings: {
                    palette: {
                        catalogue: ['https://www.first.com'],
                        npmrc: '//_authToken=token'
                    }
                },
                policy: {
                    palette: {
                        npmrc: true
                    }
                }
            },
            app.user
        )
        const lockedTemplate = await app.factory.createProjectTemplate(
            {
                name: 'endTemplate',
                settings: {
                    palette: {
                        catalogue: ['https://www.second.com', 'https://third.com'],
                        npmrc: '//_authToken=token'
                    }
                },
                policy: {
                    palette: {
                        npmrc: false
                    }
                }
            },
            app.user
        )
        const unlockedInstance = await app.factory.createInstance(
            { name: 'unlocked' },
            TestObjects.ApplicationA,
            TestObjects.stack,
            unlockedTemplate,
            TestObjects.projectType,
            { start: true }
        )
        TestObjects.unlockedInstance = unlockedInstance
        const lockedInstance = await app.factory.createInstance(
            { name: 'locked' },
            TestObjects.ApplicationA,
            TestObjects.stack,
            lockedTemplate,
            TestObjects.projectType,
            { start: true }
        )
        TestObjects.lockedInstance = lockedInstance
    })

    after(async function () {
        await app.close()
    })

    it('npmrc should be shown to owner if unlocked', async function () {
        const response = await app.inject({
            method: 'GET',
            url: `/api/v1/projects/${TestObjects.unlockedInstance.id}`,
            cookies: { sid: TestObjects.tokens.alice }
        })
        response.statusCode.should.equal(200)
        const body = response.json()
        body.template.settings.palette.npmrc.should.equal('//_authToken=token')
    })
    it('npmrc should be hidden from owner if locked', async function () {
        const response = await app.inject({
            method: 'GET',
            url: `/api/v1/projects/${TestObjects.lockedInstance.id}`,
            cookies: { sid: TestObjects.tokens.alice }
        })
        response.statusCode.should.equal(200)
        const body = response.json()
        body.template.settings.palette.npmrc.should.equal('//_authToken="xxxxxxx"')
    })
    it('npmrc should be hidden from member', async function () {
        const response = await app.inject({
            method: 'GET',
            url: `/api/v1/projects/${TestObjects.unlockedInstance.id}`,
            cookies: { sid: TestObjects.tokens.bob }
        })
        response.statusCode.should.equal(200)
        const body = response.json()
        body.template.settings.palette.npmrc.should.equal('//_authToken="xxxxxxx"')
    })
})
