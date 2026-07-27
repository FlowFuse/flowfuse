const should = require('should') // eslint-disable-line
const sinon = require('sinon')

const setup = require('../routes/setup')

const FF_UTIL = require('flowforge-test-utils')
const { PlatformAutomationHandler } = FF_UTIL.require('forge/comms/platformAutomation')

describe('PlatformAutomationHandler', function () {
    const license = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZkNDFmNmRjLTBmM2QtNGFmNy1hNzk0LWIyNWFhNGJmYTliZCIsInZlciI6IjIwMjQtMDMtMDQiLCJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGdXNlIERldmVsb3BtZW50IiwibmJmIjoxNzMwNjc4NDAwLCJleHAiOjIwNzc3NDcyMDAsIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxMCwidGVhbXMiOjEwLCJpbnN0YW5jZXMiOjEwLCJtcXR0Q2xpZW50cyI6NiwidGllciI6ImVudGVycHJpc2UiLCJkZXYiOnRydWUsImlhdCI6MTczMDcyMTEyNH0.02KMRf5kogkpH3HXHVSGprUm0QQFLn21-3QIORhxFgRE9N5DIE8YnTH_f8W_21T6TlYbDUmf4PtWyj120HTM2w'

    let app
    let handler

    function mockClient () {
        const handlers = {}
        return {
            on: (event, callback) => { handlers[event] = callback },
            emit: function () {
                const evt = arguments[0]
                const args = Array.prototype.slice.call(arguments, 1)
                handlers[evt].apply(null, args)
            }
        }
    }

    function invokeToolCall ({ userId, toolName, args, meta }) {
        return new Promise((resolve) => {
            const onSuccess = (result) => resolve({ ok: true, result })
            const onError = (message, code, err) => resolve({ ok: false, message, code, err })
            handler.eventHandler(
                {
                    userId,
                    command: 'mcp-call-tool',
                    data: { name: toolName, input: args || {} },
                    meta
                },
                onSuccess,
                onError
            )
        })
    }

    before(async function () {
        app = await setup({
            license,
            ai: { enabled: true },
            expert: { enabled: true }
        })
    })

    after(async function () {
        await app.close()
    })

    beforeEach(function () {
        const client = mockClient()
        handler = PlatformAutomationHandler(app, client)
    })

    afterEach(function () {
        sinon.restore()
    })

    describe('source context nonce injection', function () {
        it('mints a nonce with source mcp:expert and the correct toolName', async function () {
            const createSpy = sinon.spy(app.nonceStore, 'createSourceNonce')
            const tool = handler.findTool('platform_list_teams')

            const res = await invokeToolCall({
                userId: app.adminUser.hashid,
                toolName: 'platform_list_teams',
                meta: { toolDefinition: { annotations: tool.annotations } }
            })

            res.ok.should.be.true()
            createSpy.calledOnce.should.be.true()
            const nonceArgs = createSpy.firstCall.args[0]
            nonceArgs.should.have.property('source', 'mcp:expert')
            nonceArgs.should.have.property('toolName', 'platform_list_teams')
        })

        it('passes the nonce as x-ff-source-nonce header in the injected request', async function () {
            const injectSpy = sinon.spy(app, 'inject')
            const tool = handler.findTool('platform_list_teams')

            const res = await invokeToolCall({
                userId: app.adminUser.hashid,
                toolName: 'platform_list_teams',
                meta: { toolDefinition: { annotations: tool.annotations } }
            })

            res.ok.should.be.true()
            injectSpy.calledOnce.should.be.true()
            const injectOpts = injectSpy.firstCall.args[0]
            injectOpts.headers.should.have.property('x-ff-source-nonce')
            injectOpts.headers['x-ff-source-nonce'].should.be.a.String()
            injectOpts.headers['x-ff-source-nonce'].should.match(/^[a-f0-9]{32}$/)
        })

        it('mints a fresh nonce per inject call', async function () {
            const createSpy = sinon.spy(app.nonceStore, 'createSourceNonce')
            const tool = handler.findTool('platform_list_teams')

            // Call twice
            await invokeToolCall({
                userId: app.adminUser.hashid,
                toolName: 'platform_list_teams',
                meta: { toolDefinition: { annotations: tool.annotations } }
            })
            await invokeToolCall({
                userId: app.adminUser.hashid,
                toolName: 'platform_list_teams',
                meta: { toolDefinition: { annotations: tool.annotations } }
            })

            createSpy.callCount.should.be.greaterThanOrEqual(2)
        })

        it('includes authorization header with the platform token', async function () {
            const injectSpy = sinon.spy(app, 'inject')
            const tool = handler.findTool('platform_list_teams')

            await invokeToolCall({
                userId: app.adminUser.hashid,
                toolName: 'platform_list_teams',
                meta: { toolDefinition: { annotations: tool.annotations } }
            })

            injectSpy.calledOnce.should.be.true()
            const injectOpts = injectSpy.firstCall.args[0]
            injectOpts.headers.should.have.property('authorization')
            injectOpts.headers.authorization.should.startWith('Bearer ')
        })
    })

    describe('end-to-end audit trail', function () {
        it('tool call produces audit entry with source mcp:expert and toolName', async function () {
            const tool = handler.findTool('platform_create_application')

            const res = await invokeToolCall({
                userId: app.adminUser.hashid,
                toolName: 'platform_create_application',
                args: { name: 'audit-trail-test-app', teamId: app.team.hashid },
                meta: { toolDefinition: { annotations: tool.annotations } }
            })

            res.ok.should.be.true()

            const entry = await app.db.models.AuditLog.findOne({
                where: { event: 'application.created' },
                order: [['createdAt', 'DESC']]
            })
            should.exist(entry)
            entry.source.should.equal('mcp:expert')
            const body = JSON.parse(entry.body)
            body.sourceContext.should.have.property('toolName', 'platform_create_application')
        })
    })
})
