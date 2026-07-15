const { requestContext } = require('@fastify/request-context')
const should = require('should') // eslint-disable-line

const setup = require('../setup')

describe('AuditLog controller', function () {
    let app

    before(async function () {
        app = await setup()
    })

    after(async function () {
        await app.close()
    })

    afterEach(async function () {
        await app.db.models.AuditLog.destroy({ where: {} })
    })

    describe('source column', function () {
        it('writes null source when no audit context is set', async function () {
            await app.db.controllers.AuditLog.platformLog(app, null, 'test.event', {})
            const entries = await app.db.models.AuditLog.findAll()
            entries.should.have.length(1)
            should(entries[0].source).be.null()
        })

        it('writes source from request context', async function () {
            // Simulate being inside a request with audit context
            const store = requestContext
            const origGet = store.get
            store.get = (key) => {
                if (key === 'sourceContext') {
                    return { source: 'api' }
                }
                return origGet.call(store, key)
            }

            try {
                await app.db.controllers.AuditLog.teamLog(app, 1, null, 'test.event', {})
                const entries = await app.db.models.AuditLog.findAll()
                entries.should.have.length(1)
                entries[0].source.should.equal('api')
            } finally {
                store.get = origGet
            }
        })

        it('writes mcp:expert source from request context', async function () {
            const store = requestContext
            const origGet = store.get
            store.get = (key) => {
                if (key === 'sourceContext') {
                    return {
                        source: 'mcp:expert',
                        toolName: 'get-instance',
                        correlationId: 'corr-123',
                        tokenId: 42
                    }
                }
                return origGet.call(store, key)
            }

            try {
                await app.db.controllers.AuditLog.projectLog(app, 1, null, 'test.event', {})
                const entries = await app.db.models.AuditLog.findAll()
                entries.should.have.length(1)
                entries[0].source.should.equal('mcp:expert')

                const body = JSON.parse(entries[0].body)
                should(body.sourceContext).be.an.Object()
                body.sourceContext.toolName.should.equal('get-instance')
                body.sourceContext.correlationId.should.equal('corr-123')
                body.sourceContext.tokenId.should.equal(42)
            } finally {
                store.get = origGet
            }
        })

        it('includes tokenId in sourceContext for PAT API calls', async function () {
            const store = requestContext
            const origGet = store.get
            store.get = (key) => {
                if (key === 'sourceContext') {
                    return { source: 'api', tokenId: 99 }
                }
                return origGet.call(store, key)
            }

            try {
                await app.db.controllers.AuditLog.deviceLog(app, 1, null, 'test.event', { device: { id: 1 } })
                const entries = await app.db.models.AuditLog.findAll()
                entries.should.have.length(1)
                entries[0].source.should.equal('api')

                const body = JSON.parse(entries[0].body)
                should(body.sourceContext).be.an.Object()
                body.sourceContext.tokenId.should.equal(99)
                should(body.sourceContext.toolName).be.undefined()
                should(body.sourceContext.correlationId).be.undefined()
            } finally {
                store.get = origGet
            }
        })

        it('omits sourceContext when no context metadata exists', async function () {
            const store = requestContext
            const origGet = store.get
            store.get = (key) => {
                if (key === 'sourceContext') {
                    return { source: 'api' }
                }
                return origGet.call(store, key)
            }

            try {
                await app.db.controllers.AuditLog.deviceLog(app, 1, null, 'test.event', { device: { id: 1 } })
                const entries = await app.db.models.AuditLog.findAll()
                entries.should.have.length(1)
                entries[0].source.should.equal('api')

                const body = JSON.parse(entries[0].body)
                should(body.sourceContext).be.undefined()
            } finally {
                store.get = origGet
            }
        })

        it('handles all log functions consistently', async function () {
            const store = requestContext
            const origGet = store.get
            store.get = (key) => {
                if (key === 'sourceContext') {
                    return { source: 'mcp:expert', correlationId: 'c1', toolName: 't1', tokenId: 1 }
                }
                return origGet.call(store, key)
            }

            try {
                await app.db.controllers.AuditLog.platformLog(app, null, 'p.event', {})
                await app.db.controllers.AuditLog.userLog(app, null, 'u.event', {})
                await app.db.controllers.AuditLog.applicationLog(app, 1, null, 'a.event', {})
                await app.db.controllers.AuditLog.projectLog(app, 1, null, 'pr.event', {})
                await app.db.controllers.AuditLog.teamLog(app, 1, null, 'tm.event', {})
                await app.db.controllers.AuditLog.deviceLog(app, 1, null, 'd.event', {})

                const entries = await app.db.models.AuditLog.findAll()
                entries.should.have.length(6)
                for (const entry of entries) {
                    entry.source.should.equal('mcp:expert')
                    const body = JSON.parse(entry.body)
                    should(body.sourceContext).be.an.Object()
                    body.sourceContext.correlationId.should.equal('c1')
                }
            } finally {
                store.get = origGet
            }
        })
    })
})
