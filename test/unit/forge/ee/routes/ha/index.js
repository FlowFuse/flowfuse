const sleep = require('util').promisify(setTimeout)

const should = require('should') // eslint-disable-line

const setup = require('../../setup')

const FF_UTIL = require('flowforge-test-utils')
const { START_DELAY, STOP_DELAY } = FF_UTIL.require('forge/containers/stub/index.js')

describe('HA Instance API', function () {
    let app
    const TestObjects = { tokens: {} }

    before(async function () {
        app = await setup({ billing: null })
        await login('alice', 'aaPassword')

        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/projects',
            payload: {
                name: 'test-ha-project-1',
                applicationId: app.application.hashid,
                projectType: app.projectType.hashid,
                template: app.template.hashid,
                stack: app.stack.hashid
            },
            cookies: { sid: TestObjects.tokens.alice }
        })
        TestObjects.project = await app.db.models.Project.byId(JSON.parse(response.body).id)
        // Ensure the project is started
        await sleep(START_DELAY)
    })

    after(async function () {
        await app.close()
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

    it('get ha options for instance', async function () {
        const response = await app.inject({
            method: 'GET',
            url: `/api/v1/projects/${TestObjects.project.id}/ha`,
            cookies: { sid: TestObjects.tokens.alice }
        })
        response.statusCode.should.equal(200)
        const result = JSON.parse(response.body)
        result.should.be.empty()
    })

    it('rejects invalid ha options', async function () {
        const testReplicaCount = async n => {
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/projects/${TestObjects.project.id}/ha`,
                payload: {
                    replicas: n
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(409)
            const result = JSON.parse(response.body)
            result.should.have.property('code', 'invalid_ha_configuration')
        }
        await testReplicaCount(0)
        await testReplicaCount(1)
        await testReplicaCount(3)
    })

    it('applies valid ha option', async function () {
        const response = await app.inject({
            method: 'PUT',
            url: `/api/v1/projects/${TestObjects.project.id}/ha`,
            payload: {
                replicas: 2
            },
            cookies: { sid: TestObjects.tokens.alice }
        })
        response.statusCode.should.equal(200)
        const result = JSON.parse(response.body)
        result.should.have.property('replicas', 2)

        await sleep(STOP_DELAY)
        await TestObjects.project.reload()

        // Project has been stopped but is presented as "starting"
        TestObjects.project.state.should.equal('suspended')
        app.db.controllers.Project.getInflightState(TestObjects.project).should.equal('starting')

        // Wait for at least start delay as set in stub driver
        await sleep(START_DELAY + 100)

        await TestObjects.project.reload({
            include: [
                { model: app.db.models.ProjectType },
                { model: app.db.models.ProjectStack }
            ]
        })

        // Project is re-running
        TestObjects.project.state.should.equal('running')
        should(app.db.controllers.Project.getInflightState(TestObjects.project)).equal(undefined)

        const haSetting = await TestObjects.project.getHASettings()
        haSetting.should.have.property('replicas', 2)
    })

    it('removes ha option', async function () {
        // NOTE: this continues using the objects from the previous test.
        const response = await app.inject({
            method: 'DELETE',
            url: `/api/v1/projects/${TestObjects.project.id}/ha`,
            cookies: { sid: TestObjects.tokens.alice }
        })
        response.statusCode.should.equal(200)
        const result = JSON.parse(response.body)
        result.should.not.have.property('replicas')

        await sleep(STOP_DELAY)
        await TestObjects.project.reload()

        // Project has been stopped but is presented as "starting"
        TestObjects.project.state.should.equal('suspended')
        app.db.controllers.Project.getInflightState(TestObjects.project).should.equal('starting')

        // Wait for at least start delay as set in stub driver
        await sleep(START_DELAY + 100)

        await TestObjects.project.reload({
            include: [
                { model: app.db.models.ProjectType },
                { model: app.db.models.ProjectStack }
            ]
        })

        // Project is re-running
        TestObjects.project.state.should.equal('running')
        should(app.db.controllers.Project.getInflightState(TestObjects.project)).equal(undefined)

        const haSetting = await TestObjects.project.getHASettings()
        should.not.exist(haSetting)
    })

    it('removing non-existent ha option no-ops', async function () {
        // NOTE: this continues using the objects from the previous test.
        const response = await app.inject({
            method: 'DELETE',
            url: `/api/v1/projects/${TestObjects.project.id}/ha`,
            cookies: { sid: TestObjects.tokens.alice }
        })
        response.statusCode.should.equal(200)
        const result = JSON.parse(response.body)
        result.should.not.have.property('replicas')

        await sleep(STOP_DELAY)
        await TestObjects.project.reload()

        TestObjects.project.state.should.equal('running')
        should(app.db.controllers.Project.getInflightState(TestObjects.project)).equal(undefined)
    })
})
