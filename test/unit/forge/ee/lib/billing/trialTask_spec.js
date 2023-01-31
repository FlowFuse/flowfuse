const should = require('should') // eslint-disable-line
const sinon = require('sinon')
const setup = require('../../setup')
const FF_UTIL = require('flowforge-test-utils')
const { Roles } = FF_UTIL.require('forge/lib/roles')
const { KEY_BILLING_STATE } = FF_UTIL.require('forge/db/models/ProjectSettings')
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
        const trialTeam = await app.db.models.Team.create({ name: 'noBillingTeam', TeamTypeId: app.defaultTeamType.id })
        const trialSub = await app.db.controllers.Subscription.createTrialSubscription(trialTeam, Date.now() + 86400000)
        await trialTeam.addUser(TestObjects.alice, { through: { role: Roles.Owner } })

        // Create project using the permitted projectType for trials - projectType1
        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/projects',
            payload: {
                name: 'billing-project',
                team: trialTeam.hashid,
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
        const trialTeam = await app.db.models.Team.create({ name: 'noBillingTeam', TeamTypeId: app.defaultTeamType.id })
        const trialSub = await app.db.controllers.Subscription.createTrialSubscription(trialTeam, Date.now() + 86400000)

        await trialTeam.addUser(TestObjects.alice, { through: { role: Roles.Owner } })

        // Create project using the permitted projectType for trials - projectType1
        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/projects',
            payload: {
                name: 'billing-project',
                team: trialTeam.hashid,
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
        const subscription = 'sub_1234567890'
        const customer = 'cus_1234567890'
        await app.db.controllers.Subscription.createSubscription(trialTeam, subscription, customer)
        await trialSub.reload()

        // Create another project - which should get billed normalled
        const response2 = await app.inject({
            method: 'POST',
            url: '/api/v1/projects',
            payload: {
                name: 'billing-project-2',
                team: trialTeam.hashid,
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

    it.only('sends trial reminder emails at appropriate intervals', async function () {
        app.settings.set('user:team:trial-mode', true)
        app.settings.set('user:team:trial-mode:duration', 5)
        app.settings.set('user:team:trial-mode:projectType', TestObjects.projectType1.hashid)
        const DAY_MS = 86400000
        // TestObjects.ATeam - has billing setup, should not get touched

        // Create trial team without billing setup
        const trialTeam = await app.db.models.Team.create({ name: 'noBillingTeam', TeamTypeId: app.defaultTeamType.id })
        // Start with a 30 day trial
        const trialSub = await app.db.controllers.Subscription.createTrialSubscription(trialTeam, Date.now() + 30 * DAY_MS)
        await trialTeam.addUser(TestObjects.alice, { through: { role: Roles.Owner } })

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
        app.config.email.transport.messages[0].text.includes(' 7 days.').should.be.true()


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
        app.config.email.transport.messages[1].text.includes(' 1 day.').should.be.true()

        // Rerun task - ensure email not sent again
        await task(app)
        app.config.email.transport.messages.should.have.length(2)
    })
})
