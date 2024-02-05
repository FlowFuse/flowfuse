const sinon = require('sinon')

const setup = require('../../setup')

describe('Team API - with billing enabled', function () {
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

    describe('Delete Team', function () {
        it('Delete team with expired trial and projects', async function () {
            const subscription = await app.team.getSubscription()
            subscription.status = 'trial'
            subscription.trialEndsAt = Date.now() - 3000
            subscription.trialStatus = 'created'
            await subscription.save()

            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/teams/${app.team.hashid}`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)
        })
    })

    describe('Applications List', async function () {
        it('additionally includes the pipelineCount for each application', async function () {
            await login('alice', 'aaPassword')

            const TeamAApp = await app.factory.createApplication({ name: 'team-a-application' }, app.team)
            const TeamAApp2 = await app.factory.createApplication({ name: 'team-a-application-2' }, app.team)

            // 3/1 pipelines
            await app.factory.createPipeline({ name: 'pipeline 1' }, TeamAApp)
            await app.factory.createPipeline({ name: 'pipeline 2' }, TeamAApp)
            await app.factory.createPipeline({ name: 'pipeline 3' }, TeamAApp)

            await app.factory.createPipeline({ name: 'pipeline 4' }, TeamAApp2)

            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${app.team.hashid}/applications?associationsLimit=3`,
                cookies: { sid: TestObjects.tokens.alice }
            })

            response.statusCode.should.equal(200)

            const result = response.json()
            result.applications.should.have.a.lengthOf(3)

            const applicationOne = result.applications.find((application) => application.name === TeamAApp.name)

            applicationOne.should.have.property('pipelineCount', 3)

            const applicationTwo = result.applications.find((application) => application.name === TeamAApp2.name)

            applicationTwo.should.have.property('pipelineCount', 1)
        })
    })
})
