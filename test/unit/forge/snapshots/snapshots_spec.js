const should = require('should') // eslint-disable-line
const snapshots = require('../../../../forge/services/snapshots')

const FF_UTIL = require('flowforge-test-utils')

describe('Snapshots Service', function () {
    let APP, USER, TEAM

    before(async function () {
        APP = await FF_UTIL.setupApp()

        USER = await APP.db.models.User.create({ admin: true, username: 'alice', name: 'Alice Skywalker', email: 'alice@example.com', email_verified: true, password: 'aaPassword' })

        const defaultTeamType = await APP.db.models.TeamType.findOne()
        TEAM = await APP.db.models.Team.create({ name: 'ATeam', TeamTypeId: defaultTeamType.id })
    })

    describe('createSnapshot', function () {
        it('Creates a snapshot of the passed instance')
        it('Sets the snapshot as the target if setAsTarget is true')
    })

    describe('copySnapshot', function () {
        it('Creates a copy of the passed snapshot')
        it('Imports the snapshot if importSnapshot copying across the environment variables', async function () {
            const instance = await APP.db.models.Project.create({ name: 'instance-1', type: '', url: '' })

            await TEAM.addProject(instance)

            await instance.updateSettings({
                settings: {
                    // as array
                    env: [
                        { name: 'REMOVED_KEY', value: 'old-value-1' }, // should not get changed
                        { name: 'EXISTING_KEY', value: 'old-value-2' } // should not get changed
                    ]
                }
            })

            const sourceSnapshot = await APP.db.models.ProjectSnapshot.create({
                name: 'Test Snapshot',
                description: 'Test description',
                settings: {
                    env: {
                        EXISTING_KEY: 'new-value-2', // should do nothing
                        NEW_KEY: 'new-value-3' // should be added
                    }
                },
                flows: {},
                UserId: USER.id
            })

            await snapshots.copySnapshot(APP, sourceSnapshot, instance, { importSnapshot: true, setAsTarget: false })

            const instanceSettings = await instance.getSetting('settings')

            instanceSettings.env.map((envVar) => envVar.name).should.match(['REMOVED_KEY', 'EXISTING_KEY', 'NEW_KEY'])

            instanceSettings.env[0].name.should.equal('REMOVED_KEY')
            instanceSettings.env[0].value.should.equal('old-value-1')

            instanceSettings.env[1].name.should.equal('EXISTING_KEY')
            instanceSettings.env[1].value.should.equal('old-value-2')

            instanceSettings.env[2].name.should.equal('NEW_KEY')
            instanceSettings.env[2].value.should.equal('new-value-3')
        })

        it('Sets the snapshot as the target if setAsTarget is true')
    })
})
