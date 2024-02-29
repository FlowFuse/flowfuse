const should = require('should') // eslint-disable-line
const setup = require('../../setup')

describe('Subscription controller', function () {
    let app

    beforeEach(async function () {
        setup.setupStripe()
        app = await setup()
    })

    afterEach(async function () {
        await app.close()
        setup.resetStripe()
    })

    describe('createSubscription', function () {
        it('creates a new subscription for the passed team', async function () {
            const defaultTeamType = await app.db.models.TeamType.findOne({ where: { id: 1 } })
            const team = await app.db.models.Team.create({ name: 'BTeam', TeamTypeId: defaultTeamType.id })

            const newSubscription = await app.db.controllers.Subscription.createSubscription(team, 'my-subscription', 'a-customer')

            ;(await newSubscription.getTeam()).id.should.match(team.id)
            newSubscription.customer.should.equal('a-customer')
            newSubscription.subscription.should.equal('my-subscription')

            const subscription = await app.db.models.Subscription.byTeamId(team.id)

            subscription.Team.id.should.match(team.id)
            subscription.Team.name.should.match(team.name)
            subscription.customer.should.equal('a-customer')
            subscription.subscription.should.equal('my-subscription')
        })

        it('replaces an existing subscription if one already exists', async function () {
            const defaultTeamType = await app.db.models.TeamType.findOne({ where: { id: 1 } })
            const team = await app.db.models.Team.create({ name: 'BTeam', TeamTypeId: defaultTeamType.id })

            await app.db.controllers.Subscription.createSubscription(team, 'old-subscription', 'customer')

            const newSubscription = await app.db.controllers.Subscription.createSubscription(team, 'new-subscription', 'customer')

            ;(await newSubscription.getTeam()).id.should.match(team.id)

            const subscriptionCount = await app.db.models.Subscription.count({ where: { TeamId: team.id } })
            subscriptionCount.should.equal(1)

            const subscription = await app.db.models.Subscription.byTeamId(team.id)

            subscription.Team.id.should.match(team.id)
            subscription.Team.name.should.match(team.name)
            subscription.customer.should.equal('customer')
            subscription.subscription.should.equal('new-subscription')
        })

        it('updates a trial mode subscription to no longer be trial', async function () {
            const defaultTeamType = await app.db.models.TeamType.findOne({ where: { id: 1 } })
            const team = await app.db.models.Team.create({ name: 'BTeam', TeamTypeId: defaultTeamType.id })
            await app.db.controllers.Subscription.createTrialSubscription(team, Date.now() + 86400000)

            const subscription = await app.db.models.Subscription.byTeamId(team.id)
            should.exist(subscription.trialEndsAt)
            subscription.trialStatus.should.equal(app.db.models.Subscription.TRIAL_STATUS.CREATED)

            await app.db.controllers.Subscription.createSubscription(team, 'new-subscription', 'customer')

            await subscription.reload()

            subscription.Team.id.should.match(team.id)
            subscription.Team.name.should.match(team.name)
            subscription.customer.should.equal('customer')
            subscription.subscription.should.equal('new-subscription')
            should.not.exist(subscription.trialEndsAt)
            subscription.trialStatus.should.equal(app.db.models.Subscription.TRIAL_STATUS.ENDED)
        })
    })

    describe('deleteSubscription', function () {
        it('deletes the passed subscription searching by team', async function () {
            const team = await app.db.models.Team.byName('ATeam')
            ;(await app.db.models.Subscription.byTeamId(team.id)).should.not.equal(null)

            await app.db.controllers.Subscription.deleteSubscription(team)

            const subscription = await app.db.models.Subscription.byTeamId(team.id)
            ;(subscription === null).should.be.true()
        })
    })

    describe('freeTrialCreditEnabled', function () {
        it('returns true if new_customer_free_credit is set to an amount above zero', async function () {
            app.config.billing.stripe.new_customer_free_credit = 1
            should.equal(app.db.controllers.Subscription.freeTrialCreditEnabled(), true)

            app.config.billing.stripe.new_customer_free_credit = 100
            should.equal(app.db.controllers.Subscription.freeTrialCreditEnabled(), true)

            app.config.billing.stripe.new_customer_free_credit = 1000
            should.equal(app.db.controllers.Subscription.freeTrialCreditEnabled(), true)
        })

        it('returns false if new_customer_free_credit is unset or less than or equal to zero', async function () {
            delete app.config.billing.stripe.new_customer_free_credit
            should.equal(app.db.controllers.Subscription.freeTrialCreditEnabled(), false)

            app.config.billing.stripe.new_customer_free_credit = null
            should.equal(app.db.controllers.Subscription.freeTrialCreditEnabled(), false)

            app.config.billing.stripe.new_customer_free_credit = 0
            should.equal(app.db.controllers.Subscription.freeTrialCreditEnabled(), false)

            app.config.billing.stripe.new_customer_free_credit = -1000
            should.equal(app.db.controllers.Subscription.freeTrialCreditEnabled(), false)
        })

        it('returns false if configured, but team trial mode is enabled', async function () {
            app.config.billing.stripe.new_customer_free_credit = 1
            app.settings.set('user:team:trial-mode', true)
            should.equal(app.db.controllers.Subscription.freeTrialCreditEnabled(), false)
        })
    })

    describe('userEligibleForFreeTrialCredit', function () {
        it('returns true if the user has no teams', async function () {
            const newUser = await app.db.models.User.create({ admin: true, username: 'new', name: 'New', email: 'new@example.com', email_verified: true, password: 'aaPassword' })

            const eligible = await app.db.controllers.Subscription.userEligibleForFreeTrialCredit(newUser)
            should.equal(eligible, true)
        })

        it('returns false if the user has any teams', async function () {
            const user = await app.db.models.User.byEmail('alice@example.com')
            should.equal(await user.teamCount() > 0, true)

            const eligible = await app.db.controllers.Subscription.userEligibleForFreeTrialCredit(user)
            should.equal(eligible, false)
        })

        it('returns true if the user has only one team but the flag is set', async function () {
            const user = await app.db.models.User.byEmail('alice@example.com')
            should.equal(await user.teamCount() === 1, true)

            const newTeamAlreadyCreated = true
            const eligible = await app.db.controllers.Subscription.userEligibleForFreeTrialCredit(user, newTeamAlreadyCreated)
            should.equal(eligible, true)
        })
    })

    describe('Team Trials', function () {
        it('reports team trial status correctly', async function () {
            const defaultTeamType = await app.db.models.TeamType.findOne({ where: { id: 1 } })
            const team = await app.db.models.Team.create({ name: 'BTeam', TeamTypeId: defaultTeamType.id })
            const trialSubscription = await app.db.controllers.Subscription.createTrialSubscription(team, Date.now() + (5 * 86400000))

            trialSubscription.isActive().should.be.false()
            trialSubscription.isCanceled().should.be.false()
            trialSubscription.isTrial().should.be.true()
            trialSubscription.isTrialEnded().should.be.false()

            const endedSubscription = await app.db.controllers.Subscription.createTrialSubscription(team, Date.now() - (5 * 86400000))
            endedSubscription.isActive().should.be.false()
            endedSubscription.isCanceled().should.be.false()
            endedSubscription.isTrial().should.be.true()
            endedSubscription.isTrialEnded().should.be.true()
        })
    })

    describe('Past Due state', function () {
        it('treats a past_due subscription as still active', async function () {
            const defaultTeamType = await app.db.models.TeamType.findOne({ where: { id: 1 } })
            const team = await app.db.models.Team.create({ name: 'BTeam', TeamTypeId: defaultTeamType.id })

            const newSubscription = await app.db.controllers.Subscription.createSubscription(team, 'my-subscription', 'a-customer')
            newSubscription.isActive().should.be.true()
            newSubscription.isCanceled().should.be.false()
            newSubscription.isPastDue().should.be.false()

            newSubscription.status = 'past_due'
            await newSubscription.save()

            newSubscription.isActive().should.be.true()
            newSubscription.isCanceled().should.be.false()
            newSubscription.isPastDue().should.be.true()
        })
    })
})
