const should = require('should') // eslint-disable-line no-unused-vars

const { expectToolMatchesRoute, createExpertMcpToken, toolFinder, recordingInject } = require('../../../../../../lib/mcpToolEquivalence')

const FF_UTIL = require('flowforge-test-utils')

const tools = FF_UTIL.require('forge/ee/lib/mcp/tools/user')
const findTool = toolFinder(tools)

describe('MCP Platform Tools - User', function () {
    describe('platform_get_current_user', function () {
        const tool = findTool('platform_get_current_user')

        it('is defined', function () {
            should.exist(tool)
        })

        it('is read-only and non-destructive', function () {
            tool.annotations.should.have.property('readOnlyHint', true)
            tool.annotations.should.have.property('destructiveHint', false)
        })

        it('has no input schema parameters', function () {
            Object.keys(tool.inputSchema).should.eql([])
        })

        it('calls GET /api/v1/user', async function () {
            const { calls, inject } = recordingInject()
            await tool.handler({}, { inject })
            calls.should.have.length(1)
            calls[0].should.have.property('method', 'GET')
            calls[0].should.have.property('url', '/api/v1/user')
        })
    })

    describe('platform_list_notifications', function () {
        const tool = findTool('platform_list_notifications')

        it('is defined', function () {
            should.exist(tool)
        })

        it('is read-only and non-destructive', function () {
            tool.annotations.should.have.property('readOnlyHint', true)
            tool.annotations.should.have.property('destructiveHint', false)
        })

        it('exposes the base pagination parameters', function () {
            Object.keys(tool.inputSchema).should.eql(['cursor', 'limit'])
        })

        it('calls GET /api/v1/user/notifications with no query when no args are given', async function () {
            const { calls, inject } = recordingInject()
            await tool.handler({}, { inject })
            calls.should.have.length(1)
            calls[0].should.have.property('method', 'GET')
            calls[0].should.have.property('url', '/api/v1/user/notifications')
        })

        it('serialises the pagination args onto the query string', async function () {
            const { calls, inject } = recordingInject()
            await tool.handler({ cursor: 'abc123', limit: 10 }, { inject })
            calls.should.have.length(1)
            calls[0].should.have.property('method', 'GET')
            calls[0].should.have.property('url', '/api/v1/user/notifications?cursor=abc123&limit=10')
        })
    })

    describe('platform_list_own_invitations', function () {
        const tool = findTool('platform_list_own_invitations')

        it('is defined', function () {
            should.exist(tool)
        })

        it('is read-only and non-destructive', function () {
            tool.annotations.should.have.property('readOnlyHint', true)
            tool.annotations.should.have.property('destructiveHint', false)
        })

        it('has no input schema parameters', function () {
            Object.keys(tool.inputSchema).should.eql([])
        })

        it('calls GET /api/v1/user/invitations', async function () {
            const { calls, inject } = recordingInject()
            await tool.handler({}, { inject })
            calls.should.have.length(1)
            calls[0].should.have.property('method', 'GET')
            calls[0].should.have.property('url', '/api/v1/user/invitations')
        })
    })

    describe('Integration: list notifications', function () {
        const setup = require('../../../setup')
        let app
        let token

        before(async function () {
            app = await setup({ ai: { enabled: true }, expert: { enabled: true } })
            token = await createExpertMcpToken(app)
        })

        after(async function () {
            await app.close()
        })

        function inject (options) {
            return app.inject({
                ...options,
                headers: {
                    ...(options.headers || {}),
                    authorization: `Bearer ${token}`
                }
            })
        }

        it('lists notifications for the authenticated user', async function () {
            const response = await inject({ method: 'GET', url: '/api/v1/user/notifications' })
            response.statusCode.should.equal(200)
            const body = response.json()
            body.should.have.property('notifications')
            body.notifications.should.be.an.Array()
            body.should.have.property('count', body.notifications.length)
        })
    })

    describe('Integration: read tools match their backing routes', function () {
        const setup = require('../../../setup')
        let app
        let token

        before(async function () {
            app = await setup({ ai: { enabled: true }, expert: { enabled: true } })
            token = await createExpertMcpToken(app)

            // Creating the invitation also fires a 'team-invite' notification, so this one seed covers both tools.
            const invitor = await app.factory.createUser({
                username: 'ivy',
                name: 'Ivy Invitor',
                email: 'ivy@example.com',
                password: 'iiPassword'
            })
            const otherTeam = await app.factory.createTeam({ name: 'Team-Invitor' })
            await app.factory.createInvitation(otherTeam, invitor, app.user)
        })

        after(async function () {
            await app.close()
        })

        function inject (options) {
            return app.inject({
                ...options,
                headers: {
                    ...(options.headers || {}),
                    authorization: `Bearer ${token}`
                }
            })
        }

        it('platform_get_current_user matches GET /api/v1/user', async function () {
            await expectToolMatchesRoute(inject, findTool('platform_get_current_user'), {}, {
                method: 'GET',
                url: '/api/v1/user'
            })
        })

        it('platform_list_notifications matches GET /api/v1/user/notifications', async function () {
            const { routeResponse } = await expectToolMatchesRoute(inject, findTool('platform_list_notifications'), {}, {
                method: 'GET',
                url: '/api/v1/user/notifications'
            })
            // Guard against a false pass from two empty responses.
            routeResponse.json().notifications.length.should.be.above(0)
        })

        it('platform_list_own_invitations matches GET /api/v1/user/invitations', async function () {
            const { routeResponse } = await expectToolMatchesRoute(inject, findTool('platform_list_own_invitations'), {}, {
                method: 'GET',
                url: '/api/v1/user/invitations'
            })
            routeResponse.json().invitations.length.should.be.above(0)
        })
    })
})
