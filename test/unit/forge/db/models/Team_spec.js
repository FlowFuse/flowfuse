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

    it('projectCount reports correct counts', async function () {
        app = await setup({})
        const usage = await app.license.usage()
        console.log(usage)
        const ATeam = await app.db.models.Team.findOne({ where: { name: 'ATeam' } })
        const pt1 = await app.db.models.ProjectType.create({ name: 'pt1', properties: {}, active: true })
        const pt2 = await app.db.models.ProjectType.create({ name: 'pt2', properties: {}, active: true })

        const p1 = await app.db.models.Project.create({ name: 'testProject1', type: '', url: '' })
        await p1.setProjectType(pt1)
        await p1.setTeam(ATeam)

        const p2 = await app.db.models.Project.create({ name: 'testProject2', type: '', url: '' })
        await p2.setProjectType(pt1)
        await p2.setTeam(ATeam)

        const p3 = await app.db.models.Project.create({ name: 'testProject3', type: '', url: '' })
        await p3.setProjectType(pt2)
        await p3.setTeam(ATeam)

        const allCount = await ATeam.projectCount()
        allCount.should.equal(3)

        const pt1Count = await ATeam.projectCount(pt1.hashid)
        pt1Count.should.equal(2)

        const pt2Count = await ATeam.projectCount(pt2.hashid)
        pt2Count.should.equal(1)
    })

    describe('License limits', function () {
        it('Permits overage when licensed', async function () {
            // This license has limit of 4 teams (3 created by default test setup)
            const license = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGb3JnZSBJbmMuIERldmVsb3BtZW50IiwibmJmIjoxNjYyNTk1MjAwLCJleHAiOjc5ODcwNzUxOTksIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxNTAsInRlYW1zIjo0LCJwcm9qZWN0cyI6NTAsImRldmljZXMiOjUwLCJkZXYiOnRydWUsImlhdCI6MTY2MjYzMTU4N30.J6ceWv3SdFC-J_dt05geeQZHosD1D102u54tVLeu_4EwRO5OYGiqMxFW3mx5pygod3xNT68e2Wq8A7wNVCt3Rg'
            app = await setup({ license })
            // Default setup creates 3 teams
            ;(await app.db.models.Team.count()).should.equal(3)

            const defaultTeamType = await app.db.models.TeamType.findOne()

            await app.db.models.Team.create({ name: 'T4', TeamTypeId: defaultTeamType.id })
            ;(await app.db.models.Team.count()).should.equal(4)

            await app.db.models.Team.create({ name: 'T5', TeamTypeId: defaultTeamType.id })
            ;(await app.db.models.Team.count()).should.equal(5)
        })
        it('Does not permit overage when unlicensed', async function () {
            app = await setup({ })
            app.license.defaults.teams = 4 // override default

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
