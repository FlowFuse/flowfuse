const should = require('should') // eslint-disable-line
const setup = require('../setup')

describe('Team model', function () {
    // Use standard test data.
    let app

    afterEach(async function () {
        if (app) {
            await app.close()
            app = null
        }
    })

    describe('License limits', function () {
        it('limits how many teams can be created according to license', async function () {
            // This license has limit of 4 teams (3 created by default test setup)
            const license = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGb3JnZSBJbmMuIERldmVsb3BtZW50IiwibmJmIjoxNjYyNTk1MjAwLCJleHAiOjc5ODcwNzUxOTksIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxNTAsInRlYW1zIjo0LCJwcm9qZWN0cyI6NTAsImRldmljZXMiOjUwLCJkZXYiOnRydWUsImlhdCI6MTY2MjYzMTU4N30.J6ceWv3SdFC-J_dt05geeQZHosD1D102u54tVLeu_4EwRO5OYGiqMxFW3mx5pygod3xNT68e2Wq8A7wNVCt3Rg'
            app = await setup({ license })
            // Default setup creates 3 teams
            ;(await app.db.models.Team.count()).should.equal(3)

            const defaultTeamType = await app.db.models.TeamType.findOne()

            await app.db.models.Team.create({ name: 'T4', TeamTypeId: defaultTeamType.id })
            ;(await app.db.models.Team.count()).should.equal(4)

            try {
                await app.db.models.Team.create({ name: 'T5', TeamTypeId: defaultTeamType.id })
                return Promise.reject(new Error('able to create team that exceeds limit'))
            } catch (err) { }

            await app.db.models.Team.destroy({ where: { name: 'T4' } })
            ;(await app.db.models.Team.count()).should.equal(3)

            await app.db.models.Team.create({ name: 'T5', TeamTypeId: defaultTeamType.id })
            ;(await app.db.models.Team.count()).should.equal(4)
        })
    })
})
