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
    })

    after(async function () {
        await app.close()
    })

    beforeEach(async function () {
        await app.db.models.Device.destroy({ where: {} })
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
        device1.lastSeenAt = null
        device2.lastSeenAt = null
        device3.lastSeenAt = null
        device3.createdAt = new Date()
        await device1.save()
        await device2.save()

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
        const device2 = await app.factory.createDevice({ name: 'app-dev-2' }, app.team, null, app.application)
        device1.lastSeenAt = new Date()
        device2.lastSeenAt = null
        await device1.save()
        await device2.save()

        // run the task
        await unusedDeviceReminderTask.run(app)
        // check that send was not called
        app.postoffice.send.called.should.be.false()
    })

    it('should not send email if unused devices were created more than 14 days ago', async function () {
        // create a new device and add it to team
        const device1 = await app.factory.createDevice({ name: 'app-dev-1' }, app.team, null, app.application)
        const device2 = await app.factory.createDevice({ name: 'app-dev-2' }, app.team, null, app.application)
        device1.lastSeenAt = null
        device2.lastSeenAt = null
        await forceUpdateDeviceCreatedAt(device1, device1.createdAt.getDate() - 16)
        await forceUpdateDeviceCreatedAt(device2, device2.createdAt.getDate() - 16)

        // run the task
        await unusedDeviceReminderTask.run(app)
        // check that send was not called
        app.postoffice.send.called.should.be.false()
    })
})
