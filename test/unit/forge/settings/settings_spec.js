const should = require('should') // eslint-disable-line

const setup = require('./setup') 

describe.only('Platform Settings', function () {
    let app

    before(async function () {
        app = await setup()
    })

    after(async function () {
        await app.close()
    })

    describe('read settings', function () {
        it('read default value', async function () {
            const value = app.settings.get('telemetry:enabled')
            value.should.equal(true)
        })
    })
    describe('update settings', function () {
        it('value should change', async function () {
             const origValue = app.settings.get('telemetry:enabled')
             const origDBValue = await app.db.models.PlatformSettings.findOne({
                where: { key: 'telemetry:enabled'}
             })
             should(origValue).be.undefined
             app.settings.set('telemetry:enabled', false)
             const newValue = app.settings.get('telemetry:enabled')
             newValue.should.equal(false)
             newValue.should.not.equal(origValue)
             const newDBValue = await app.db.models.PlatformSettings.findOne({
                where: { key: 'telemetry:enabled'}
             })
             newDBValue.value.should.equal(false)
        })
    })
})