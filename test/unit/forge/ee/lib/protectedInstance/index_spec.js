const setup = require('../../setup')

describe('Protected Instance - lib', function () {
    let app

    before(async function () {
        app = await setup()

        const defaultTeamType = await app.db.models.TeamType.findOne({ where: { id: 1 } })
        const defaultTeamTypeProperties = defaultTeamType.properties
        if (defaultTeamTypeProperties.features) {
            defaultTeamTypeProperties.features.protectedInstance = true
        } else {
            defaultTeamTypeProperties.features = {
                protectedInstance: true
            }
        }
        defaultTeamType.properties = defaultTeamTypeProperties
        await defaultTeamType.save()

        const team1 = await app.db.models.Team.create({ name: 'BTeam', TeamTypeId: defaultTeamType.id })
        app.team1 = team1
    })

    after(async function () {
        app.close()
    })

    it('Protected Instance enabled in default team type', async function () {
        const enabled = await app.protectedInstance.isProtectedInstanceAllowed(app.team1)
        enabled.should.equal(true)
    })
})
