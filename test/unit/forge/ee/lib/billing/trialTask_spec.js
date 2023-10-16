const should = require('should') // eslint-disable-line
const sinon = require('sinon')

const setup = require('../../setup')

const FF_UTIL = require('flowforge-test-utils')
const { Roles } = FF_UTIL.require('forge/lib/roles')
const trialTask = FF_UTIL.require('forge/ee/lib/billing/trialTask')

describe('Billing - Trial Housekeeper Task', function () {
    const sandbox = sinon.createSandbox()
    let app
    let task
    const TestObjects = { tokens: {} }

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
        if (app) {
            await app.close()
            app = null
        }
        setup.resetStripe()
        sandbox.restore()
    })

    beforeEach(async function () {
        setup.setupStripe()
        app = await setup({ housekeeper: false })

        task = trialTask.init(app)
        TestObjects.tokens = {}

        TestObjects.alice = app.user
        TestObjects.ATeam = app.team
        TestObjects.projectType1 = app.projectType
        TestObjects.template1 = app.template
        TestObjects.stack1 = app.stack

        // app.settings.set('user:team:trial-mode', true)
        // app.settings.set('user:team:trial-mode:duration', 5)
        // app.settings.set('user:team:trial-mode:projectType', TestObjects.projectType1.hashid)
        const teamTypeProps = app.defaultTeamType.properties
        teamTypeProps.trial = {
            active: true,
            duration: 5,
            instanceType: app.projectType.hashid
        }
        app.defaultTeamType.properties = teamTypeProps
        await app.defaultTeamType.save()

        await login('alice', 'aaPassword')

        sandbox.stub(app.log, 'info')
        sandbox.stub(app.log, 'warn')
        sandbox.stub(app.log, 'error')
    })

    it('suspends projects if the team trial has ended', async function () {
        // TestObjects.ATeam - has billing setup, should not get touched

        // Create trial team without billing setup
        const trialTeam = await app.factory.createTeam({ name: 'noBillingTeam' })
        const trialSub = await app.factory.createTrialSubscription(trialTeam)
        await trialTeam.addUser(TestObjects.alice, { through: { role: Roles.Owner } })

        // Create application for team
        const application = await app.factory.createApplication({ name: 'trialApp' }, trialTeam)

        // Create project using the permitted projectType for trials - projectType1
        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/projects',
            payload: {
                name: 'billing-project',
                applicationId: application.hashid,
                projectType: TestObjects.projectType1.hashid,
                template: TestObjects.template1.hashid,
                stack: TestObjects.stack1.hashid
            },
            cookies: { sid: TestObjects.tokens.alice }
        })

        response.statusCode.should.equal(200)
        const projectDetails = response.json()
        const project = await app.db.models.Project.byId(projectDetails.id)
        project.state.should.equal('running')
        // ;(await project.getSetting(KEY_BILLING_STATE)).should.equal(app.db.models.ProjectSettings.BILLING_STATES.TRIAL)

        // Expire the trial
        trialSub.trialEndsAt = new Date(Date.now() - 1000)
        await trialSub.save()

        // Run the task
        await task(app)

        await project.reload()
        project.state.should.equal('suspended')
        // ;(await project.getSetting(KEY_BILLING_STATE)).should.equal(app.db.models.ProjectSettings.BILLING_STATES.NOT_BILLED)

        await trialSub.reload()
        should.not.exist(trialSub.trialEndsAt)

        app.config.email.transport.messages.should.have.length(1)
        const email = app.config.email.transport.messages[0]
        email.should.have.property('to', TestObjects.alice.email)
        email.text.includes(TestObjects.alice.name).should.be.true()
        // Testing the specific body text is going to be too brittle
    })

    it('sends trial reminder emails at appropriate intervals', async function () {
        const DAY_MS = 86400000
        // TestObjects.ATeam - has billing setup, should not get touched

        // Create trial team without billing setup
        const trialTeam = await app.factory.createTeam({ name: 'noBillingTeam' })
        await trialTeam.addUser(TestObjects.alice, { through: { role: Roles.Owner } })

        // Generate the billing Url for later checking that emails contain it
        const billingUrl = `${app.config.base_url}/team/${trialTeam.slug}/billing`
        // Start with a 30 day trial
        const trialSub = await app.factory.createTrialSubscription(trialTeam, 30)

        await task(app)

        // Nothing should have happened
        app.config.email.transport.messages.should.have.length(0)
        await trialSub.reload()
        trialSub.trialStatus.should.equal(app.db.models.Subscription.TRIAL_STATUS.CREATED)

        // Change end date to 7 days
        trialSub.trialEndsAt = Date.now() + 7 * DAY_MS
        await trialSub.save()

        await task(app)
        app.config.email.transport.messages.should.have.length(1)
        await trialSub.reload()
        trialSub.trialStatus.should.equal(app.db.models.Subscription.TRIAL_STATUS.WEEK_EMAIL_SENT)
        const email1 = app.config.email.transport.messages[0]
        email1.text.includes(' 7 days.').should.be.true()
        // check that the email includes the billing url to conform with stripe/visa requirements
        email1.should.have.a.property('text').and.containEql(billingUrl)
        email1.should.have.a.property('html').and.containEql(billingUrl)

        // Rerun task - ensure email not sent again
        await task(app)
        app.config.email.transport.messages.should.have.length(1)

        // Change end date to 1 day
        trialSub.trialEndsAt = Date.now() + 1 * DAY_MS
        await trialSub.save()

        await task(app)
        app.config.email.transport.messages.should.have.length(2)
        await trialSub.reload()
        trialSub.trialStatus.should.equal(app.db.models.Subscription.TRIAL_STATUS.DAY_EMAIL_SENT)
        const email2 = app.config.email.transport.messages[1]
        email2.text.includes(' 1 day.').should.be.true()
        // check that the email text includes the billing url to conform with stripe/visa requirements
        email2.should.have.a.property('text').and.containEql(billingUrl)
        email2.should.have.a.property('html').and.containEql(billingUrl)

        // Rerun task - ensure email not sent again
        await task(app)
        app.config.email.transport.messages.should.have.length(2)
    })
})
