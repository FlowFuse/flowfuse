const should = require('should') // eslint-disable-line no-unused-vars
const sinon = require('sinon')

const tools = require('../../../../../../../forge/ee/lib/mcp/tools/teams')

function getTool (name) {
    return tools.find(tool => tool.name === name)
}

describe('MCP Teams Tools', function () {
    let inject

    beforeEach(function () {
        inject = sinon.stub()
    })

    // Single-route readers: each injects one method+url and returns the response verbatim.
    const passthroughTools = [
        { name: 'platform_list_teams', method: 'GET', url: '/api/v1/user/teams', args: {} },
        { name: 'platform_get_team_membership', method: 'GET', url: '/api/v1/teams/team1/user', args: { teamId: 'team1' } },
        { name: 'platform_list_team_members', method: 'GET', url: '/api/v1/teams/team1/members', args: { teamId: 'team1' } },
        { name: 'platform_list_team_invitations', method: 'GET', url: '/api/v1/teams/team1/invitations', args: { teamId: 'team1' } },
        { name: 'platform_list_team_npm_packages', method: 'GET', url: '/api/v1/teams/team1/npm/packages', args: { teamId: 'team1' } },
        { name: 'platform_list_team_git_tokens', method: 'GET', url: '/api/v1/teams/team1/git/tokens', args: { teamId: 'team1' } }
    ]

    passthroughTools.forEach(({ name, method, url, args }) => {
        describe(name, function () {
            const tool = getTool(name)

            it('injects the right route and returns the response', async function () {
                const routeResponse = { statusCode: 200, json: () => ({}) }
                inject.withArgs({ method, url }).resolves(routeResponse)

                const response = await tool.handler(args, { inject })

                inject.calledOnce.should.be.true()
                response.should.equal(routeResponse)
            })

            it('passes through an error response', async function () {
                const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found' }) }
                inject.resolves(errorResponse)

                const response = await tool.handler(args, { inject })
                response.should.equal(errorResponse)
            })
        })
    })

    describe('platform_get_team', function () {
        const tool = getTool('platform_get_team')

        it('looks up by hashid when teamId is given', async function () {
            const routeResponse = { statusCode: 200, json: () => ({}) }
            inject.withArgs({ method: 'GET', url: '/api/v1/teams/team1' }).resolves(routeResponse)

            const response = await tool.handler({ teamId: 'team1' }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('looks up by slug when teamSlug is given', async function () {
            const routeResponse = { statusCode: 200, json: () => ({}) }
            inject.withArgs({ method: 'GET', url: '/api/v1/teams/slug/my-team' }).resolves(routeResponse)

            const response = await tool.handler({ teamSlug: 'my-team' }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ teamId: 'team1' }, { inject })
            response.should.equal(errorResponse)
        })

        it('rejects when neither teamId nor teamSlug is given', async function () {
            const response = await tool.handler({}, { inject })

            inject.called.should.be.false()
            response.code.should.equal(400)
            response.isError.should.be.true()
        })

        it('rejects when both teamId and teamSlug are given', async function () {
            const response = await tool.handler({ teamId: 'team1', teamSlug: 'my-team' }, { inject })

            inject.called.should.be.false()
            response.code.should.equal(400)
            response.isError.should.be.true()
        })
    })

    describe('platform_get_team_instance_counts', function () {
        const tool = getTool('platform_get_team_instance_counts')

        it('serialises instanceType, a state array and applicationId', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ count: 0 }) }
            const url = '/api/v1/teams/team1/instance-counts?instanceType=hosted&state=running&state=stopped&applicationId=app1'
            inject.withArgs({ method: 'GET', url }).resolves(routeResponse)

            const response = await tool.handler({ teamId: 'team1', instanceType: 'hosted', state: ['running', 'stopped'], applicationId: 'app1' }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('omits state and applicationId when not provided', async function () {
            inject.resolves({ statusCode: 200, json: () => ({ count: 0 }) })

            await tool.handler({ teamId: 'team1', instanceType: 'remote' }, { inject })

            inject.firstCall.args[0].url.should.equal('/api/v1/teams/team1/instance-counts?instanceType=remote')
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ teamId: 'team1', instanceType: 'hosted' }, { inject })
            response.should.equal(errorResponse)
        })
    })

    describe('platform_get_team_audit_log', function () {
        const base = '/api/v1/teams/team1/audit-log'
        const tool = getTool('platform_get_team_audit_log')

        it('injects the bare route when no filters are set', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ log: [] }) }
            inject.withArgs({ method: 'GET', url: base }).resolves(routeResponse)

            const response = await tool.handler({ teamId: 'team1' }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('serialises cursor, limit, query, an event array, username, scope and includeChildren', async function () {
            inject.resolves({ statusCode: 200, json: () => ({ log: [] }) })

            await tool.handler({
                teamId: 'team1',
                cursor: 'abc',
                limit: 20,
                query: 'deploy',
                event: ['team.settings.updated', 'user.invited'],
                username: 'alice',
                scope: 'application',
                includeChildren: true
            }, { inject })

            inject.firstCall.args[0].url.should.equal(
                `${base}?cursor=abc&limit=20&query=deploy&event=team.settings.updated&event=user.invited&username=alice&scope=application&includeChildren=true`
            )
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ teamId: 'team1' }, { inject })
            response.should.equal(errorResponse)
        })
    })
})
