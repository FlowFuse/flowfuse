const should = require('should') // eslint-disable-line
const setup = require('../setup')

describe('Device model', function () {
    // Use standard test data.
    let app

    describe('License limits', function () {
        afterEach(async function () {
            await app.close()
        })
        it('Permits overage when licensed', async function () {
            // This license has limit of 2 devices
            const license = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGb3JnZSBJbmMuIERldmVsb3BtZW50IiwibmJmIjoxNjYyNTk1MjAwLCJleHAiOjc5ODcwNzUxOTksIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxNTAsInRlYW1zIjo1MCwicHJvamVjdHMiOjUwLCJkZXZpY2VzIjoyLCJkZXYiOnRydWUsImlhdCI6MTY2MjY1MzkyMX0.Tj4fnuDuxi_o5JYltmVi1Xj-BRn0aEjwRPa_fL2MYa9MzSwnvJEd-8bsRM38BQpChjLt-wN-2J21U7oSq2Fp5A'
            app = await setup({ license })

            ;(await app.db.models.Device.count()).should.equal(0)

            await app.db.models.Device.create({ name: 'D1', type: '', credentialSecret: '' })
            await app.db.models.Device.create({ name: 'D2', type: '', credentialSecret: '' })
            await app.db.models.Device.create({ name: 'D3', type: '', credentialSecret: '' })
            ;(await app.db.models.Device.count()).should.equal(3)
        })

        it('Does not permit overage when unlicensed', async function () {
            app = await setup({ })
            app.license.defaults.instances = 2

            ;(await app.db.models.Device.count()).should.equal(0)

            await app.db.models.Device.create({ name: 'D1', type: '', credentialSecret: '' })
            await app.db.models.Device.create({ name: 'D2', type: '', credentialSecret: '' })
            ;(await app.db.models.Device.count()).should.equal(2)

            try {
                await app.db.models.Device.create({ name: 'D3', type: '', credentialSecret: '' })
                return Promise.reject(new Error('able to create device that exceeds limit'))
            } catch (err) { }

            await app.db.models.Device.destroy({ where: { name: 'D2', type: '', credentialSecret: '' } })
            ;(await app.db.models.Device.count()).should.equal(1)
            await app.db.models.Device.create({ name: 'D3', type: '', credentialSecret: '' })
            ;(await app.db.models.Device.count()).should.equal(2)
        })
    })
    describe('Settings hash', function () {
        before(async function () {
            app = await setup()
        })
        after(async function () {
            await app.close()
        })
        it('is updated when the device name is changed', async function () {
            const device = await app.db.models.Device.create({ name: 'D1', type: 'PI', credentialSecret: '' })
            await device.save()
            const initialSettingsHash = device.settingsHash
            // make a change - change name
            device.name = 'D2'
            await device.save()
            device.settingsHash.should.not.equal(initialSettingsHash)
        })
        it('is updated when the device type is changed', async function () {
            const device = await app.db.models.Device.create({ name: 'D1', type: 'PI', credentialSecret: '' })
            await device.save()
            const initialSettingsHash = device.settingsHash
            // make a change - change type
            device.type = 'RPi'
            await device.save()
            device.settingsHash.should.not.equal(initialSettingsHash)
        })
        it('is updated when the device env vars are changed', async function () {
            const device = await app.db.models.Device.create({ name: 'D1', type: 'PI', credentialSecret: '' })
            const initialSettingsHash = device.settingsHash
            const initialSettings = await device.getAllSettings()
            initialSettings.should.have.a.property('env').and.be.an.Array()
            const initialEnvCount = initialSettings.env.length // count of current env vars (includes platform env vars FF_DEVICE_XX)
            // make a change - add 1 env var
            await device.updateSettings({ env: [{ name: 'ev1', value: 'ev1-val' }] })
            device.settingsHash.should.not.equal(initialSettingsHash)
            const settings = await device.getAllSettings()
            should(settings).be.an.Object().and.have.a.property('env').of.Array()
            settings.env.length.should.equal(initialEnvCount + 1) // count should be +1
        })
        it('is not updated when the device option autoSnapshot is changed', async function () {
            const device = await app.db.models.Device.create({ name: 'D1', type: 'PI', credentialSecret: '' })
            const initialSettingsHash = device.settingsHash
            const initialSettings = await device.getAllSettings()
            initialSettings.should.have.a.property('autoSnapshot', true) // should be true by default
            await device.updateSettings({ autoSnapshot: false })
            device.settingsHash.should.equal(initialSettingsHash)
            const settings = await device.getAllSettings()
            should(settings).be.an.Object().and.have.a.property('autoSnapshot', false)
        })
    })
})
