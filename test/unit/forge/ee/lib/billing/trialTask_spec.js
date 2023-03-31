const should = require('should') // eslint-disable-line
const sinon = require('sinon')
const setup = require('../../setup')
const sleep = require('util').promisify(setTimeout)
const FF_UTIL = require('flowforge-test-utils')
const { Roles } = FF_UTIL.require('forge/lib/roles')
const { KEY_BILLING_STATE } = FF_UTIL.require('forge/db/models/ProjectSettings')
const { STOP_DELAY } = FF_UTIL.require('forge/containers/stub/index.js')
const trialTask = FF_UTIL.require('forge/ee/lib/billing/trialTask')

describe('Billing - Trial Housekeeper Task', function () {
    const sandbox = sinon.createSandbox()
    let app
    let task
    let stripe
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
        stripe = setup.setupStripe()
        app = await setup({ housekeeper: false })

        task = trialTask.init(app)
        TestObjects.tokens = {}

        TestObjects.alice = app.user
        TestObjects.ATeam = app.team
        TestObjects.projectType1 = app.projectType
        TestObjects.template1 = app.template
        TestObjects.stack1 = app.stack

        await login('alice', 'aaPassword')

        sandbox.stub(app.log, 'info')
        sandbox.stub(app.log, 'warn')
        sandbox.stub(app.log, 'error')
    })

    it('suspends projects if the team trial has ended', async function () {
        app.settings.set('user:team:trial-mode', true)
        app.settings.set('user:team:trial-mode:duration', 5)
        app.settings.set('user:team:trial-mode:projectType', TestObjects.projectType1.hashid)

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
        ;(await project.getSetting(KEY_BILLING_STATE)).should.equal(app.db.models.ProjectSettings.BILLING_STATES.TRIAL)

        // Expire the trial
        trialSub.trialEndsAt = new Date(Date.now() - 1000)
        await trialSub.save()

        // Run the task
        await task(app)

        await project.reload()
        project.state.should.equal('suspended')
        ;(await project.getSetting(KEY_BILLING_STATE)).should.equal(app.db.models.ProjectSettings.BILLING_STATES.NOT_BILLED)

        await trialSub.reload()
        should.not.exist(trialSub.trialEndsAt)

        app.config.email.transport.messages.should.have.length(1)
        const email = app.config.email.transport.messages[0]
        email.should.have.property('to', TestObjects.alice.email)
        email.text.includes(TestObjects.alice.name).should.be.true()
        // Testing the specific body text is going to be too brittle
    })

    it('adds trial projects to billing the team trial has ended', async function () {
        app.settings.set('user:team:trial-mode', true)
        app.settings.set('user:team:trial-mode:duration', 5)
        app.settings.set('user:team:trial-mode:projectType', TestObjects.projectType1.hashid)

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
        ;(await project.getSetting(KEY_BILLING_STATE)).should.equal(app.db.models.ProjectSettings.BILLING_STATES.TRIAL)
        stripe.subscriptions.update.callCount.should.equal(0)
        stripe.subscriptionItems.update.callCount.should.equal(0)

        // Enable billing on the team
        await app.factory.createSubscription(trialTeam)
        await trialSub.reload()

        // Create another project - which should get billed normally
        const response2 = await app.inject({
            method: 'POST',
            url: '/api/v1/projects',
            payload: {
                name: 'billing-project-2',
                applicationId: application.hashid,
                projectType: TestObjects.projectType1.hashid,
                template: TestObjects.template1.hashid,
                stack: TestObjects.stack1.hashid
            },
            cookies: { sid: TestObjects.tokens.alice }
        })
        response2.statusCode.should.equal(200)
        const projectDetails2 = response2.json()
        stripe.subscriptions.update.callCount.should.equal(1)
        stripe.subscriptionItems.update.callCount.should.equal(0)
        stripe._.data.sub_1234567890.metadata.should.have.property(projectDetails2.id, 'true')
        stripe._.data.sub_1234567890.items.data[0].should.have.property('quantity', 1)

        // Expire the trial
        trialSub.trialEndsAt = new Date(Date.now() - 1000)
        await trialSub.save()

        // Run the task
        await task(app)

        ;(await project.getSetting(KEY_BILLING_STATE)).should.equal(app.db.models.ProjectSettings.BILLING_STATES.BILLED)
        stripe.subscriptions.update.callCount.should.equal(2)
        stripe.subscriptionItems.update.callCount.should.equal(1)
        stripe._.data.sub_1234567890.metadata.should.have.property(project.id, 'true')
        stripe._.data.sub_1234567890.metadata.should.have.property(projectDetails2.id, 'true')
        stripe._.data.sub_1234567890.items.data[0].should.have.property('quantity', 2)

        await trialSub.reload()
        should.not.exist(trialSub.trialEndsAt)

        app.config.email.transport.messages.should.have.length(1)
        const email = app.config.email.transport.messages[0]
        email.should.have.property('to', TestObjects.alice.email)
        email.text.includes(TestObjects.alice.name).should.be.true()
    })

    it('does not add a suspended trial project to billing when team trial has ended', async function () {
        app.settings.set('user:team:trial-mode', true)
        app.settings.set('user:team:trial-mode:duration', 5)
        app.settings.set('user:team:trial-mode:projectType', TestObjects.projectType1.hashid)

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

        // Suspend the project
        const suspendResponse = await app.inject({
            method: 'POST',
            url: `/api/v1/projects/${projectDetails.id}/actions/suspend`,
            cookies: { sid: TestObjects.tokens.alice }
        })
        suspendResponse.statusCode.should.equal(200)

        await sleep(STOP_DELAY + 50)

        // Verify the project is suspended and the billing state is still 'trial'
        const project = await app.db.models.Project.byId(projectDetails.id)
        project.state.should.equal('suspended')
        ;(await project.getSetting(KEY_BILLING_STATE)).should.equal(app.db.models.ProjectSettings.BILLING_STATES.TRIAL)
        stripe.subscriptions.update.callCount.should.equal(0)
        stripe.subscriptionItems.update.callCount.should.equal(0)

        // Enable billing on the team
        await app.factory.createSubscription(trialTeam)
        await trialSub.reload()

        // Expire the trial
        trialSub.trialEndsAt = new Date(Date.now() - 1000)
        await trialSub.save()

        // Run the task
        await task(app)

        // Verify the trial project has not been added to billing
        // and its billing state has been moved to not_billed
        ;(await project.getSetting(KEY_BILLING_STATE)).should.equal(app.db.models.ProjectSettings.BILLING_STATES.NOT_BILLED)
        stripe.subscriptions.update.callCount.should.equal(0)
        stripe.subscriptionItems.update.callCount.should.equal(0)
    })

    it('sends trial reminder emails at appropriate intervals', async function () {
        app.settings.set('user:team:trial-mode', true)
        app.settings.set('user:team:trial-mode:duration', 5)
        app.settings.set('user:team:trial-mode:projectType', TestObjects.projectType1.hashid)
        const DAY_MS = 86400000
        // TestObjects.ATeam - has billing setup, should not get touched

        // Create trial team without billing setup
        const trialTeam = await app.factory.createTeam({ name: 'noBillingTeam' })
        await trialTeam.addUser(TestObjects.alice, { through: { role: Roles.Owner } })

        // Generate the billing Url for later checking that emails contain it
        const billingUrl = `${app.config.base_url}/team/${trialTeam.slug}/billing`
        // Start with a 30 day trial
        const trialSub = await app.factory.createTrialSubscription(trialTeam, 30)

        // Generate the billing Url for later checking that emails contain it
        const billingUrl = `${app.config.base_url}/team/${trialTeam.slug}/billing`

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
