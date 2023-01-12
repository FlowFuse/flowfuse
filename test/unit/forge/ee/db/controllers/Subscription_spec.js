const should = require('should') // eslint-disable-line
const setup = require('../../setup')

describe('Subscription controller', function () {
    let app
    beforeEach(async function () {
        app = await setup()
    })

    afterEach(async function () {
        await app.close()
    })

    describe('createSubscription', function () {
        it('creates a new subscription for the passed team', async function () {
            const defaultTeamType = await app.db.models.TeamType.findOne()
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
            const defaultTeamType = await app.db.models.TeamType.findOne()
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
    })

    describe('deleteSubscription', function () {
        it('deletes the passed subscription searching by team', async function () {
            const team = await app.db.models.Team.byName('ATeam')
            ;(await app.db.models.Subscription.byTeamId(team.id)).should.not.equal(null)

            await app.db.controllers.Subscription.deleteSubscription(team)

            const subscription = await app.db.models.Subscription.byTeamId(team.id)
            should(subscription).equal(null)
        })
    })

    describe('freeTrialsEnabled', function () {
        it('returns true if new_customer_free_credit is set to an amount above zero', async function () {
            app.config.billing.stripe.new_customer_free_credit = 1
            should.equal(app.db.controllers.Subscription.freeTrialsEnabled(), true)

            app.config.billing.stripe.new_customer_free_credit = 100
            should.equal(app.db.controllers.Subscription.freeTrialsEnabled(), true)

            app.config.billing.stripe.new_customer_free_credit = 1000
            should.equal(app.db.controllers.Subscription.freeTrialsEnabled(), true)
        })

        it('returns false if new_customer_free_credit is unset or less than or equal to zero', async function () {
            should.equal(app.db.controllers.Subscription.freeTrialsEnabled(), false)

            app.config.billing.stripe.new_customer_free_credit = null
            should.equal(app.db.controllers.Subscription.freeTrialsEnabled(), false)

            app.config.billing.stripe.new_customer_free_credit = 0
            should.equal(app.db.controllers.Subscription.freeTrialsEnabled(), false)

            app.config.billing.stripe.new_customer_free_credit = -1000
            should.equal(app.db.controllers.Subscription.freeTrialsEnabled(), false)
        })
    })

    describe('userEligibleForFreeTrial', function () {
        it('returns true if the user has no teams', async function () {
            const newUser = await app.db.models.User.create({ admin: true, username: 'new', name: 'New', email: 'new@example.com', email_verified: true, password: 'aaPassword' })

            const eligible = await app.db.controllers.Subscription.userEligibleForFreeTrial(newUser)
            should.equal(eligible, true)
        })

        it('returns false if the user has any teams', async function () {
            const user = await app.db.models.User.byEmail('alice@example.com')
            should.equal(await user.teamCount() > 0, true)

            const eligible = await app.db.controllers.Subscription.userEligibleForFreeTrial(user)
            should.equal(eligible, false)
        })

        it('returns true if the user has only one team but the flag is set', async function () {
            const user = await app.db.models.User.byEmail('alice@example.com')
            should.equal(await user.teamCount() === 1, true)

            const newTeamAlreadyCreated = true
            const eligible = await app.db.controllers.Subscription.userEligibleForFreeTrial(user, newTeamAlreadyCreated)
            should.equal(eligible, true)
        })
    })
})
