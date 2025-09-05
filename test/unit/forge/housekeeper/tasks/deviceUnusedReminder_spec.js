const { Op } = require('sequelize')
const should = require('should') // eslint-disable-line
const sinon = require('sinon')

const unusedDeviceReminderTask = require('../../../../../forge/housekeeper/tasks/deviceUnusedReminder')

const setup = require('../setup')

async function forceUpdateDeviceCreatedAt (device, date) {
    // Ref: https://github.com/sequelize/sequelize/issues/3759#issuecomment-1580202535
    device.changed('createdAt', true)
    device.set('createdAt', date || new Date('2000-01-01T00:00:00Z'), { raw: true })
    await device.save({ silent: true, fields: ['createdAt'] })
    await device.reload()
}

describe('Device Unused Reminder Task', function () {
    // PREMISE:
    // Add 4 devices, 2 of which will trigger email reminders
    // * Device1 is ~1d old  - should send email
    // * Device2 is ~3d old  - should NOT send email
    // * Device3 is ~5d old  - should send email
    // * Device4 is ~6d old  - should NOT send email

    /** @type {import('../setup').TestApplication} */
    let app
    let device1 // defaults to being created ~1d ago
    let device2 // defaults to being created ~3d ago
    let device3 // defaults to being created ~5d ago
    let device4 // defaults to being created ~6d ago

    before(async function () {
        app = await setup()
    })

    beforeEach(async function () {
        sinon.stub(app.postoffice, 'send').callsFake(() => {
            return Promise.resolve()
        })
        sinon.stub(app.log, 'info')
        sinon.stub(app.log, 'warn')
        device1 = await app.factory.createDevice({ name: 'app-dev-1' }, app.team, null, app.application)
        device2 = await app.factory.createDevice({ name: 'app-dev-2' }, app.team, null, app.application)
        device3 = await app.factory.createDevice({ name: 'app-dev-3' }, app.team, null, app.application)
        device4 = await app.factory.createDevice({ name: 'app-dev-4' }, app.team, null, app.application)

        const now = Date.now()
        await forceUpdateDeviceCreatedAt(device1, new Date(now - 1 * 24 * 60 * 60 * 1000)) // ~1d ago
        await forceUpdateDeviceCreatedAt(device2, new Date(now - 3 * 24 * 60 * 60 * 1000)) // ~3d ago
        await forceUpdateDeviceCreatedAt(device3, new Date(now - 5 * 24 * 60 * 60 * 1000)) // ~5d ago
        await forceUpdateDeviceCreatedAt(device4, new Date(now - 6 * 24 * 60 * 60 * 1000)) // ~6d ago
    })

    after(async function () {
        await app.close()
    })

    afterEach(async function () {
        await app.db.models.Device.destroy({ where: {} })
        // delete any team not named ATeam
        await app.db.models.Team.destroy({ where: { name: { [Op.ne]: 'ATeam' } } })
        // delete all users except alice
        await app.db.models.User.destroy({ where: { email: { [Op.ne]: 'alice@example.com' } } })
        // unsuspend alice
        app.user.suspended = false
        await app.user.save()
        sinon.restore()
    })

    it('should not send email if there are no devices', async function () {
        // delete all devices
        await app.db.models.Device.destroy({ where: {} })
        // run the task
        await unusedDeviceReminderTask.run(app)
        // check that send was not called
        app.postoffice.send.called.should.be.false()
    })

    it('should send email for unused devices created less than ~24h and ~5d days ago', async function () {
        // run the task
        await unusedDeviceReminderTask.run(app)
        // check that send was called twice (once for device created ~24h ago and once for device created ~5 days ago)
        app.postoffice.send.calledTwice.should.be.true()

        app.postoffice.send.firstCall.args[0].should.be.an.Object()
        app.postoffice.send.firstCall.args[0].email.should.equal('alice@example.com')
        app.postoffice.send.firstCall.args[1].should.equal('DeviceUnusedReminder')
        app.postoffice.send.firstCall.args[2].should.be.an.Object()
        app.postoffice.send.firstCall.args[2].should.have.property('url', `${app.config.base_url}/device/${device1.hashid}`)
        app.postoffice.send.firstCall.args[2].should.have.property('teamName', 'ATeam')
        app.postoffice.send.firstCall.args[2].deviceName.should.have.property('text', 'app-dev-1')
        app.postoffice.send.firstCall.args[2].deviceName.should.have.property('html', 'app-dev-1')

        app.postoffice.send.secondCall.args[0].should.be.an.Object()
        app.postoffice.send.secondCall.args[0].email.should.equal('alice@example.com')
        app.postoffice.send.secondCall.args[1].should.equal('DeviceUnusedReminder')
        app.postoffice.send.secondCall.args[2].should.be.an.Object()
        app.postoffice.send.secondCall.args[2].should.have.property('url', `${app.config.base_url}/device/${device3.hashid}`)
        app.postoffice.send.secondCall.args[2].should.have.property('teamName', 'ATeam')
        app.postoffice.send.secondCall.args[2].deviceName.should.have.property('text', 'app-dev-3')
        app.postoffice.send.secondCall.args[2].deviceName.should.have.property('html', 'app-dev-3')
    })

    it('should not send email if team has any used devices', async function () {
        // set lastSeenAt to now
        device1.lastSeenAt = new Date()
        await device1.save()

        // run the task
        await unusedDeviceReminderTask.run(app)
        // check that send was not called
        app.postoffice.send.called.should.be.false()
    })

    it('should not send email if unused devices were just created ~12h ago', async function () {
        const now = Date.now()
        await forceUpdateDeviceCreatedAt(device1, new Date(now - 2 * 60 * 60 * 1000)) // ~2 hours ago
        await forceUpdateDeviceCreatedAt(device2, new Date(now - 12 * 60 * 60 * 1000)) // ~12 hours ago
        await forceUpdateDeviceCreatedAt(device3, new Date(now - 17 * 60 * 60 * 1000)) // ~17 hours ago

        // run the task
        await unusedDeviceReminderTask.run(app)
        // check that send was not called
        app.postoffice.send.called.should.be.false()
    })

    it('should not send email if unused devices were created more than 6 days ago', async function () {
        const now = Date.now()
        await forceUpdateDeviceCreatedAt(device1, new Date(now - 6 * 24 * 60 * 60 * 1000)) // ~6 days ago
        await forceUpdateDeviceCreatedAt(device2, new Date(now - 7 * 24 * 60 * 60 * 1000)) // ~7 days ago
        await forceUpdateDeviceCreatedAt(device3, new Date(now - 28 * 24 * 60 * 60 * 1000)) // ~28 days ago

        // run the task
        await unusedDeviceReminderTask.run(app)
        // check that send was not called
        app.postoffice.send.called.should.be.false()
    })

    it('should not send email for unused devices where team is suspended', async function () {
        // set lastSeenAt on a teamA device to now to prevent emails in that team
        device1.lastSeenAt = new Date()
        await device1.save()

        // create team b and bob
        const teamB = await app.factory.createTeam({ name: 'BTeam' })
        const userBob = await app.factory.createUser({
            username: 'bob',
            name: 'Bob Fett',
            email: 'bob@example.com',
            password: 'bbPassword'
        })
        await teamB.addUser(userBob, { through: { role: app.factory.Roles.Roles.Owner } })
        const device = await app.factory.createDevice({ name: 'app-dev-1' }, teamB, null, app.application)
        await forceUpdateDeviceCreatedAt(device, new Date(Date.now() - 24 * 60 * 60 * 1000)) // ~1 day ago

        // suspend team b
        teamB.suspended = true
        await teamB.save()

        // run the task
        await unusedDeviceReminderTask.run(app)
        // check that send was not called
        app.postoffice.send.called.should.be.false()
    })

    it('should not send email for unused devices to users who are suspended', async function () {
        // leave only 1 device (the 24h old one)
        await device2.destroy()
        await device3.destroy()

        // add new owner to team
        const userBob = await app.factory.createUser({
            username: 'bob',
            name: 'Bob Fett',
            email: 'bob@example.com',
            password: 'bbPassword'
        })
        await app.team.addUser(userBob, { through: { role: app.factory.Roles.Roles.Owner } })
        userBob.suspended = true
        await userBob.save()

        // run the task
        await unusedDeviceReminderTask.run(app)

        // check that only alice was sent a single email for the remaining 24h old device
        app.postoffice.send.calledOnce.should.be.true()
        app.postoffice.send.firstCall.args[0].should.be.an.Object()
        app.postoffice.send.firstCall.args[0].email.should.equal('alice@example.com')
    })

    it('should not send any emails when all users are suspended', async function () {
        // const device = await app.factory.createDevice({ name: 'app-dev-1' }, app.team, null, app.application)

        // suspend all users in the team
        app.user.suspended = true
        await app.user.save()

        await unusedDeviceReminderTask.run(app)
        app.postoffice.send.called.should.be.false()

        // should have logged a message ~ No active team owners found for device <hashid> (<name>) in team <hashid> (<name>)
        app.log.warn.calledWith(`No active team owners found for device ${device1.hashid} (app-dev-1) in team ${app.team.hashid} (${app.team.name})`).should.be.true()
        app.log.warn.calledWith(`No active team owners found for device ${device2.hashid} (app-dev-2) in team ${app.team.hashid} (${app.team.name})`).should.be.false()
        app.log.warn.calledWith(`No active team owners found for device ${device3.hashid} (app-dev-3) in team ${app.team.hashid} (${app.team.name})`).should.be.true()
        app.log.warn.calledWith(`No active team owners found for device ${device4.hashid} (app-dev-4) in team ${app.team.hashid} (${app.team.name})`).should.be.false()
    })

    it('should not send any email when team trial has ended', async function () {
        // stub app.db.models.Subscription.byTeamId so that it returns a subscription with trialStatus = ENDED
        sinon.stub(app.db.models.Subscription, 'byTeamId').callsFake(async () => {
            return {
                trialStatus: app.db.models.Subscription.TRIAL_STATUS.ENDED
            }
        })

        await unusedDeviceReminderTask.run(app)
        app.postoffice.send.called.should.be.false()

        // app.db.models.Subscription should have been called with the team id
        app.db.models.Subscription.byTeamId.calledWith(app.team.id).should.be.true()
    })
})
