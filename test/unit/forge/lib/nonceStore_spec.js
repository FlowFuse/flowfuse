const should = require('should') // eslint-disable-line

const { NonceStore } = require('../../../../forge/lib/nonceStore')

describe('NonceStore', function () {
    let store

    beforeEach(function () {
        store = new NonceStore()
    })

    afterEach(function () {
        store.close()
    })

    describe('create', function () {
        it('returns a hex string nonce', function () {
            const nonce = store.create({ foo: 'bar' })
            should(nonce).be.a.String()
            nonce.should.match(/^[a-f0-9]{32}$/)
        })

        it('returns unique nonces on each call', function () {
            const a = store.create({ a: 1 })
            const b = store.create({ b: 2 })
            a.should.not.equal(b)
        })
    })

    describe('consume', function () {
        it('returns the stored metadata', function () {
            const metadata = { source: 'mcp:expert', toolName: 'test-tool' }
            const nonce = store.create(metadata)
            const result = store.consume(nonce)
            should(result).deepEqual(metadata)
        })

        it('returns null on second consume (single-use)', function () {
            const nonce = store.create({ source: 'mcp:expert' })
            store.consume(nonce)
            const second = store.consume(nonce)
            should(second).be.null()
        })

        it('returns null for unknown nonce', function () {
            const result = store.consume('nonexistent')
            should(result).be.null()
        })

        it('returns null for expired nonce', function (done) {
            const nonce = store.create({ source: 'mcp:expert' }, 50) // 50ms TTL
            setTimeout(() => {
                const result = store.consume(nonce)
                should(result).be.null()
                done()
            }, 100)
        })

        it('returns metadata for non-expired nonce', function () {
            const metadata = { source: 'mcp:expert' }
            const nonce = store.create(metadata, 5000) // 5s TTL
            const result = store.consume(nonce)
            should(result).deepEqual(metadata)
        })
    })

    describe('custom TTL', function () {
        it('accepts a custom TTL per nonce', function (done) {
            const nonce = store.create({ source: 'test' }, 50)
            // Immediately should work
            should(store.consume(nonce)).not.be.null()

            // Create another with same short TTL
            const nonce2 = store.create({ source: 'test2' }, 50)
            setTimeout(() => {
                should(store.consume(nonce2)).be.null()
                done()
            }, 100)
        })
    })

    describe('createSourceNonce', function () {
        it('creates a nonce when required fields are present', function () {
            const metadata = { source: 'mcp:expert', correlationId: 'abc-123', toolName: 'get-instance', tokenId: 42 }
            const nonce = store.createSourceNonce(metadata)
            should(nonce).be.a.String()
            const result = store.consume(nonce)
            should(result).deepEqual(metadata)
        })

        it('throws when source is missing', function () {
            should(() => {
                store.createSourceNonce({ correlationId: 'abc-123' })
            }).throw('source is required for source context nonces')
        })

        it('generates correlationId when not provided', function () {
            const metadata = { source: 'mcp:expert' }
            const nonce = store.createSourceNonce(metadata)
            const result = store.consume(nonce)
            should(result.source).equal('mcp:expert')
            should(result.correlationId).be.a.String()
            result.correlationId.should.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
        })

        it('does not mutate the caller metadata object', function () {
            const metadata = { source: 'mcp:expert' }
            store.createSourceNonce(metadata)
            should(metadata.correlationId).be.undefined()
        })
    })

    describe('close', function () {
        it('clears all entries', function () {
            const nonce = store.create({ source: 'test' })
            store.close()
            const result = store.consume(nonce)
            should(result).be.null()
        })
    })
})
