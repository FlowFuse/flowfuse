const should = require('should') // eslint-disable-line
const FF_UTIL = require('flowforge-test-utils')
const { LocalTransport } = require('flowforge-test-utils/forge/postoffice/localTransport.js')
const { Roles } = FF_UTIL.require('forge/lib/roles')
const { START_DELAY } = FF_UTIL.require('forge/containers/stub/index.js')

async function waitFor (delay) {
    return new Promise((resolve) => { setTimeout(() => resolve(), delay) })
}

describe('Project Lifecycle', function () {
    // forge - this will be the running FF application we are testing
    let forge
    // inbox - a local transport we can use to capture email without an SMTP server
    const inbox = new LocalTransport()

    const TestObjects = {}

    async function getProjectState (id) {
        const response = await forge.inject({
            method: 'GET',
            url: `/api/v1/projects/${id}`,
            cookies: { sid: TestObjects.accessToken }
        })
        return response.json()
    }

    before(async function () {
        // Create the FF application with a suitable test configuration
        forge = await FF_UTIL.setupApp({
            telemetry: { enabled: false },
            logging: {
                level: 'warn'
            },
            driver: {
                type: 'stub'
            },
            db: {
                type: 'sqlite',
                storage: ':memory:'
            },
            email: {
                enabled: true,
                transport: inbox
            }
        })

        // Setup the database with basic artefacts

        const defaultTeamType = await forge.db.models.TeamType.byName('starter')

        await forge.db.models.PlatformSettings.upsert({ key: 'setup:initialised', value: true })
        TestObjects.userAlice = await forge.db.models.User.create({ admin: true, username: 'alice', name: 'Alice Skywalker', email: 'alice@example.com', email_verified: true, password: 'aaPassword' })
        TestObjects.ATeam = await forge.db.models.Team.create({ name: 'ATeam', TeamTypeId: defaultTeamType.id })
        await TestObjects.ATeam.addUser(TestObjects.userAlice, { through: { role: Roles.Owner } })
        TestObjects.ProjectType1 = await forge.db.models.ProjectType.create({
            name: 'projectType1',
            active: true,
            properties: {}
        })
        TestObjects.Stack1 = await forge.db.models.ProjectStack.create({
            name: 'stack1',
            active: true,
            properties: { foo: 'bar' }
        })

        await TestObjects.Stack1.setProjectType(TestObjects.ProjectType1)

        TestObjects.Stack2 = await forge.db.models.ProjectStack.create({
            name: 'stack2',
            active: true,
            properties: { foo: 'bar' }
        })
        TestObjects.Template1 = await forge.db.models.ProjectTemplate.create({
            name: 'template1',
            active: true,
            settings: { },
            policy: { }
        })
    })

    after(function () {
        return forge.close()
    })

    it('login user', async function () {
        const response = await forge.inject({
            method: 'POST',
            url: '/account/login',
            payload: { username: 'alice', password: 'aaPassword', remember: false }
        })
        response.cookies.should.have.length(1)
        response.cookies[0].should.have.property('name', 'sid')
        TestObjects.accessToken = response.cookies[0].value
    })

    it('Create a project', async function () {
        const response = await forge.inject({
            method: 'POST',
            url: '/api/v1/projects',
            cookies: { sid: TestObjects.accessToken },
            payload: {
                name: 'test-project',
                team: TestObjects.ATeam.hashid,
                projectType: TestObjects.ProjectType1.hashid,
                stack: TestObjects.Stack1.hashid,
                template: TestObjects.Template1.hashid
            }
        })
        TestObjects.Project1 = response.json()
        TestObjects.Project1.should.have.property('name', 'test-project')
        TestObjects.Project1.should.have.property('team')
        TestObjects.Project1.team.should.have.property('id', TestObjects.ATeam.hashid)
        TestObjects.Project1.should.have.property('stack')
        TestObjects.Project1.stack.should.have.property('id', TestObjects.Stack1.hashid)
        TestObjects.Project1.should.have.property('template')
        TestObjects.Project1.template.should.have.property('id', TestObjects.Template1.hashid)

        TestObjects.Project1.should.have.property('meta')
        TestObjects.Project1.meta.should.have.property('state', 'starting')

        // Stub driver puts extra info in the meta property so we can verify
        // the right things got passed through
        TestObjects.Project1.meta.should.have.property('stack', TestObjects.Stack1.hashid)
    })

    it('Project starts asynchronously to the create', async function () {
        await waitFor(START_DELAY + 100)
        const response = await getProjectState(TestObjects.Project1.id)
        response.meta.should.have.property('state', 'running')
    })

    it('Rejects stack update for invalid stack', async function () {
        const response = await forge.inject({
            method: 'PUT',
            url: `/api/v1/projects/${TestObjects.Project1.id}`,
            cookies: { sid: TestObjects.accessToken },
            payload: {
                stack: 'does_not_exist'
            }
        })
        response.should.have.property('statusCode', 400)
        const payload = response.json()
        payload.should.have.property('error', 'Invalid stack')
    })
    it('Update project stack', async function () {
        await forge.inject({
            method: 'PUT',
            url: `/api/v1/projects/${TestObjects.Project1.id}`,
            cookies: { sid: TestObjects.accessToken },
            payload: {
                stack: TestObjects.Stack2.hashid
            }
        })

        let response = await getProjectState(TestObjects.Project1.id)
        response.meta.state.should.eql('starting')

        await waitFor(1000)

        response = await getProjectState(TestObjects.Project1.id)
        response.meta.state.should.eql('running')

        // Check the stub driver is now reporting the new stack
        response.meta.should.have.property('stack', TestObjects.Stack2.hashid)
    })

    it('Delete project', async function () {
        await forge.inject({
            method: 'DELETE',
            url: `/api/v1/projects/${TestObjects.Project1.id}`,
            cookies: { sid: TestObjects.accessToken }
        })

        const response = await forge.inject({
            method: 'GET',
            url: `/api/v1/teams/${TestObjects.ATeam.hashid}/projects`,
            cookies: { sid: TestObjects.accessToken }
        })
        response.json().projects.should.have.length(0)
    })
})
