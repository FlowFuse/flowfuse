const { Op } = require('sequelize')
const should = require('should') // eslint-disable-line
const sinon = require('sinon')

const unusedDeviceReminderTask = require('../../../../../forge/housekeeper/tasks/deviceUnusedReminder')

const setup = require('../setup')

describe('Device Unused Reminder Task', function () {
    /** @type {import('../setup').TestApplication} */
    let app

    before(async function () {
        app = await setup()
        sinon.stub(app.postoffice, 'send').callsFake(() => {
            return Promise.resolve()
        })
        sinon.stub(app.log, 'info')
        sinon.stub(app.log, 'warn')
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
        // reset spies
        app.log.info.reset()
        app.log.warn.reset()
        app.postoffice.send.resetHistory()
    })

    async function forceUpdateDeviceCreatedAt (device, date) {
        device.changed('createdAt', true)
        device.set('createdAt', date || new Date('2000-01-01T00:00:00Z'), { raw: true })
        await device.save({ silent: true, fields: ['createdAt'] })
        await device.reload()
    }

    it('should not send email if there are no devices', async function () {
        // run the task
        await unusedDeviceReminderTask.run(app)
        // check that send was not called
        app.postoffice.send.called.should.be.false()
    })

    it('should send email for unused devices created less than 14 days ago', async function () {
        // create a new device and add it to team
        const device1 = await app.factory.createDevice({ name: 'app-dev-1' }, app.team, null, app.application)
        const device2 = await app.factory.createDevice({ name: 'app-dev-2' }, app.team, null, app.application)
        const device3 = await app.factory.createDevice({ name: 'app-dev-3' }, app.team, null, app.application)

        // Force device3 to be created before 14 days ago. Ref: https://github.com/sequelize/sequelize/issues/3759#issuecomment-1580202535
        await forceUpdateDeviceCreatedAt(device3, device3.createdAt.getDate() - 16)

        // run the task
        await unusedDeviceReminderTask.run(app)
        // check that send was called twice (once for each device created less than 14 days ago)
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
        app.postoffice.send.secondCall.args[2].should.have.property('url', `${app.config.base_url}/device/${device2.hashid}`)
        app.postoffice.send.secondCall.args[2].should.have.property('teamName', 'ATeam')
        app.postoffice.send.secondCall.args[2].deviceName.should.have.property('text', 'app-dev-2')
        app.postoffice.send.secondCall.args[2].deviceName.should.have.property('html', 'app-dev-2')
    })

    it('should not send email if team has any used devices', async function () {
        // create a new device and add it to team
        const device1 = await app.factory.createDevice({ name: 'app-dev-1' }, app.team, null, app.application)
        await app.factory.createDevice({ name: 'app-dev-2' }, app.team, null, app.application)
        device1.lastSeenAt = new Date()
        await device1.save()

        // run the task
        await unusedDeviceReminderTask.run(app)
        // check that send was not called
        app.postoffice.send.called.should.be.false()
    })

    it('should not send email if unused devices were created more than 14 days ago', async function () {
        // create a new device and add it to team
        const device1 = await app.factory.createDevice({ name: 'app-dev-1' }, app.team, null, app.application)
        const device2 = await app.factory.createDevice({ name: 'app-dev-2' }, app.team, null, app.application)
        await forceUpdateDeviceCreatedAt(device1, device1.createdAt.getDate() - 16)
        await forceUpdateDeviceCreatedAt(device2, device2.createdAt.getDate() - 16)

        // run the task
        await unusedDeviceReminderTask.run(app)
        // check that send was not called
        app.postoffice.send.called.should.be.false()
    })

    it('should not send email for unused devices where team is suspended', async function () {
        // create team b and bob
        const teamB = await app.factory.createTeam({ name: 'BTeam' })
        const userBob = await app.factory.createUser({
            username: 'bob',
            name: 'Bob Fett',
            email: 'bob@example.com',
            password: 'bbPassword'
        })
        await teamB.addUser(userBob, { through: { role: app.factory.Roles.Roles.Owner } })
        await app.factory.createDevice({ name: 'app-dev-1' }, teamB, null, app.application)

        // suspend team b
        teamB.suspended = true
        await teamB.save()

        // run the task
        await unusedDeviceReminderTask.run(app)
        // check that send was not called
        app.postoffice.send.called.should.be.false()
    })

    it('should not send email for unused devices to users who are suspended', async function () {
        // add new owner to team
        const userBob = await app.factory.createUser({
            username: 'bob',
            name: 'Bob Fett',
            email: 'bob@example.com',
            password: 'bbPassword'
        })
        userBob.suspended = true
        await userBob.save()
        await app.team.addUser(userBob, { through: { role: app.factory.Roles.Roles.Owner } })
        await app.factory.createDevice({ name: 'app-dev-1' }, app.team, null, app.application)

        // run the task
        await unusedDeviceReminderTask.run(app)

        // check that only alice was sent an email
        app.postoffice.send.calledOnce.should.be.true()
        app.postoffice.send.firstCall.args[0].should.be.an.Object()
        app.postoffice.send.firstCall.args[0].email.should.equal('alice@example.com')
    })

    it('should not send any emails when all users are suspended', async function () {
        const device = await app.factory.createDevice({ name: 'app-dev-1' }, app.team, null, app.application)

        // suspend all users in the team
        app.user.suspended = true
        await app.user.save()

        await unusedDeviceReminderTask.run(app)
        app.postoffice.send.called.should.be.false()

        // should have logged a message ~ No active team owners found for device <hashid> (<name>) in team <hashid> (<name>)
        app.log.warn.calledWith(`No active team owners found for device ${device.hashid} (app-dev-1) in team ${app.team.hashid} (${app.team.name})`).should.be.true()
    })

    it('should not send any email when team trial has ended', async function () {
        await app.factory.createDevice({ name: 'app-dev-1' }, app.team, null, app.application)

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

        // should have logged a message about skipping the team
        app.log.info.calledWith(`Skip sending unused device reminder to users of team ${app.team.hashid} (${app.team.name}) because it is expired`).should.be.true()
    })
})
