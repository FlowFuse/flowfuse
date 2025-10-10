const sleep = require('util').promisify(setTimeout)

const should = require('should') // eslint-disable-line
const setup = require('./setup')

describe('Platform Settings', function () {
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
        function mockSocket () {
            let received = []
            const handlers = {}
            return {
                platformId: 'test-platform-id',
                publish: (topic, payload, opts, callback) => {
                    received.push({ topic, payload })
                    if (callback) {
                        setImmediate(() => callback())
                    }
                },
                send: (data) => {
                    received.push(data)
                },
                on: (event, callback) => {
                    handlers[event] = callback
                },
                emit: function () {
                    const evt = arguments[0]
                    const args = Array.prototype.slice.call(arguments, 1)
                    handlers[evt].apply(null, args)
                },
                received: () => received,
                clearReceived: () => { received = [] }
            }
        }

        let client

        beforeEach(function () {
            client = mockSocket()

            app.comms.platform.settings.sync = function (key) {
                const msg = {
                    key,
                    srcId: 'stub'
                }
                client.publish('ff/v1/platform/sync', JSON.stringify(msg))
            }
        })

        it('value should change', async function () {
            const origValue = app.settings.get('telemetry:enabled')
            origValue.should.equal(true)
            const origDBValue = await app.db.models.PlatformSettings.findOne({
                where: { key: 'telemetry:enabled' }
            })
            should(origDBValue).equal(null)
            app.settings.set('telemetry:enabled', false)
            const newValue = app.settings.get('telemetry:enabled')
            newValue.should.equal(false)
            newValue.should.not.equal(origValue)
            const newDBValue = await app.db.models.PlatformSettings.findOne({
                where: { key: 'telemetry:enabled' }
            })
            newDBValue.value.should.equal(false)
        })
        it('should publish when settings changed', async function () {
            app.settings.set('telemetry:enabled', false)
            await sleep(100)
            const messages = client.received()
            messages.should.have.length(1)
            const payload = JSON.parse(messages[0].payload)
            payload.key.should.equal('telemetry:enabled')
        })
    })
})
