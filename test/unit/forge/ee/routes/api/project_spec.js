const FF_UTIL = require('flowforge-test-utils')
const should = require('should')
const sinon = require('sinon')
const sleep = require('util').promisify(setTimeout)
const setup = require('../../setup')

const { START_DELAY, STOP_DELAY } = FF_UTIL.require('forge/containers/stub/index.js')
const { KEY_BILLING_STATE } = FF_UTIL.require('forge/db/models/ProjectSettings')

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
                        projectType: projectType.id,
                        stack: stack.id
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })

                response.statusCode.should.equal(200)

                await sleep(START_DELAY + STOP_DELAY + 50)

                should.equal(app.billing.removeProject.calledOnce, true)
                should.equal(app.billing.addProject.calledOnce, true)
            })
        })

        describe('Change project stack', function () {
            it('Skips removing the project from billing when changing only stack but marks billing state as billed', async function () {
                const BILLING_STATES = app.db.models.ProjectSettings.BILLING_STATES

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

                should(await project.getSetting(KEY_BILLING_STATE)).equal(BILLING_STATES.UNKNOWN)

                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/projects/${app.project.id}`,
                    payload: {
                        stack: stack.id
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })

                response.statusCode.should.equal(200)

                await sleep(STOP_DELAY + 50)

                should(await project.getSetting(KEY_BILLING_STATE)).equal(BILLING_STATES.BILLED)

                await sleep(START_DELAY + 50)

                should.equal(app.billing.removeProject.calledOnce, false) // skipped
                should.equal(app.billing.addProject.calledOnce, true)
            })
        })
    })
})
