const should = require('should') // eslint-disable-line no-unused-vars

const { SendMqttMessageAwaitReply } = require('../../../../forge/comms/utils/sendMqttMessageAwaitReply')

describe('SendMqttMessageAwaitReply', function () {
    describe('create', function () {
        it('should return correlationData, mqttOptions, and a promise', function () {
            const awaitReply = new SendMqttMessageAwaitReply()
            const { correlationData, mqttOptions, promise } = awaitReply.create()

            correlationData.should.be.a.String()
            correlationData.length.should.be.greaterThan(0)
            mqttOptions.should.have.propertyByPath('properties', 'correlationData').equal(correlationData)
            promise.should.be.a.Promise()

            awaitReply.clear()
        })

        it('should generate unique correlationData per call', function () {
            const awaitReply = new SendMqttMessageAwaitReply()
            const a = awaitReply.create()
            const b = awaitReply.create()

            a.correlationData.should.not.equal(b.correlationData)

            awaitReply.clear()
        })
    })

    describe('resolve', function () {
        it('should resolve the promise with the payload', async function () {
            const awaitReply = new SendMqttMessageAwaitReply()
            const { correlationData, promise } = awaitReply.create()

            awaitReply.resolve(correlationData, { result: 'hello' })

            const response = await promise
            response.result.should.equal('hello')
        })

        it('should handle correlationData arriving as a Buffer', async function () {
            const awaitReply = new SendMqttMessageAwaitReply()
            const { correlationData, promise } = awaitReply.create()

            awaitReply.resolve(Buffer.from(correlationData), { result: 'from-buffer' })

            const response = await promise
            response.result.should.equal('from-buffer')
        })

        it('should be a no-op for unknown correlationData', function () {
            const awaitReply = new SendMqttMessageAwaitReply();

            (function () {
                awaitReply.resolve('nonexistent', { result: 'x' })
            }).should.not.throw()
        })

        it('should be a no-op for null or missing correlationData', function () {
            const awaitReply = new SendMqttMessageAwaitReply();

            (function () {
                awaitReply.resolve(null, {})
                awaitReply.resolve(undefined, {})
            }).should.not.throw()
        })

        it('should only resolve once per correlationData', async function () {
            const awaitReply = new SendMqttMessageAwaitReply()
            const { correlationData, promise } = awaitReply.create()

            awaitReply.resolve(correlationData, { call: 'first' })
            awaitReply.resolve(correlationData, { call: 'second' })

            const response = await promise
            response.call.should.equal('first')
        })
    })

    describe('timeout', function () {
        it('should reject the promise after the timeout', async function () {
            const awaitReply = new SendMqttMessageAwaitReply({ timeout: 50 })
            const { promise } = awaitReply.create()

            let rejected = false
            try {
                await promise
            } catch (err) {
                rejected = true
                err.message.should.equal('Request timed out')
            }
            rejected.should.equal(true)
        })

        it('should respect per-request timeout override', async function () {
            const awaitReply = new SendMqttMessageAwaitReply({ timeout: 60000 })
            const { promise } = awaitReply.create({ timeout: 50 })

            let rejected = false
            try {
                await promise
            } catch (err) {
                rejected = true
                err.message.should.equal('Request timed out')
            }
            rejected.should.equal(true)
        })
    })

    describe('clear', function () {
        it('should clean up all pending entries without rejecting', function (done) {
            const awaitReply = new SendMqttMessageAwaitReply({ timeout: 100 })
            awaitReply.create()
            awaitReply.create()

            Object.keys(awaitReply.pending).length.should.equal(2)

            awaitReply.clear()

            Object.keys(awaitReply.pending).length.should.equal(0)

            // Wait past the original timeout to confirm no unhandled rejections
            setTimeout(done, 150)
        })
    })

    describe('concurrent requests', function () {
        it('should correlate multiple in-flight requests independently', async function () {
            const awaitReply = new SendMqttMessageAwaitReply()

            const req1 = awaitReply.create()
            const req2 = awaitReply.create()
            const req3 = awaitReply.create()

            // Resolve out of order
            awaitReply.resolve(req3.correlationData, { order: 3 })
            awaitReply.resolve(req1.correlationData, { order: 1 })
            awaitReply.resolve(req2.correlationData, { order: 2 })

            const [r1, r2, r3] = await Promise.all([req1.promise, req2.promise, req3.promise])

            r1.order.should.equal(1)
            r2.order.should.equal(2)
            r3.order.should.equal(3)
        })
    })
})
