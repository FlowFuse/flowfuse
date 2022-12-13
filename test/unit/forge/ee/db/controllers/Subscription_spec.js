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

            const subscription = await app.db.models.Subscription.byTeam(team.id)

            subscription.Team.id.should.match(team.id)
            subscription.Team.name.should.match(team.name)
            subscription.customer.should.equal('a-customer')
            subscription.subscription.should.equal('my-subscription')
        })
    })

    describe('deleteSubscription', function () {
        it('deletes the passed subscription searching by team', async function () {
            const team = await app.db.models.Team.byName('ATeam')
            ;(await app.db.models.Subscription.byTeam(team.id)).should.not.equal(null)

            await app.db.controllers.Subscription.deleteSubscription(team)

            const subscription = await app.db.models.Subscription.byTeam(team.id)
            should(subscription).equal(null)
        })
    })
})
