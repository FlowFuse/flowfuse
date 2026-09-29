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
            response.statusCode.should.equal(400)
            response.json().should.match({ code: 'invalid_request' })
        })

        it('rejects when both teamId and teamSlug are given', async function () {
            const response = await tool.handler({ teamId: 'team1', teamSlug: 'my-team' }, { inject })

            inject.called.should.be.false()
            response.statusCode.should.equal(400)
            response.json().should.match({ code: 'invalid_request' })
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

    describe('platform_create_team', function () {
        const tool = getTool('platform_create_team')

        it('posts the team payload and returns the response', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ id: 'team1' }) }
            inject.withArgs({ method: 'POST', url: '/api/v1/teams', payload: { name: 'New Team', type: 'type1', slug: 'new-team' } }).resolves(routeResponse)

            const response = await tool.handler({ name: 'New Team', type: 'type1', slug: 'new-team' }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('only sends the optional fields that were provided', async function () {
            inject.resolves({ statusCode: 200, json: () => ({ id: 'team1' }) })

            await tool.handler({ name: 'New Team', type: 'type1' }, { inject })

            inject.firstCall.args[0].payload.should.eql({ name: 'New Team', type: 'type1' })
        })

        it('forwards trial and billingInterval when provided', async function () {
            inject.resolves({ statusCode: 200, json: () => ({ id: 'team1' }) })

            await tool.handler({ name: 'New Team', type: 'type1', trial: true, billingInterval: 'year' }, { inject })

            inject.firstCall.args[0].payload.should.eql({ name: 'New Team', type: 'type1', trial: true, billingInterval: 'year' })
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 400, json: () => ({ code: 'invalid_team_type' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ name: 'New Team', type: 'nope' }, { inject })
            response.should.equal(errorResponse)
        })
    })

    describe('platform_update_team', function () {
        const tool = getTool('platform_update_team')

        it('puts name and slug onto the team route', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ id: 'team1' }) }
            inject.withArgs({ method: 'PUT', url: '/api/v1/teams/team1', payload: { name: 'Renamed', slug: 'renamed' } }).resolves(routeResponse)

            const response = await tool.handler({ teamId: 'team1', name: 'Renamed', slug: 'renamed' }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('only sends the fields that were provided', async function () {
            inject.resolves({ statusCode: 200, json: () => ({ id: 'team1' }) })

            await tool.handler({ teamId: 'team1', name: 'Renamed' }, { inject })

            inject.firstCall.args[0].payload.should.eql({ name: 'Renamed' })
        })

        it('never exposes type, suspended, features or properties', function () {
            Object.keys(tool.inputSchema).should.eql(['teamId', 'name', 'slug'])
        })

        it('rejects an update with nothing to change, which the route answers 200 to', async function () {
            const response = await tool.handler({ teamId: 'team1' }, { inject })

            inject.called.should.be.false()
            response.statusCode.should.equal(400)
            response.json().code.should.equal('invalid_request')
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 400, json: () => ({ code: 'invalid_slug' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ teamId: 'team1', slug: 'create' }, { inject })
            response.should.equal(errorResponse)
        })
    })

    describe('platform_change_member_role', function () {
        const tool = getTool('platform_change_member_role')

        it('puts the role onto the team member route', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ status: 'okay' }) }
            inject.withArgs({ method: 'PUT', url: '/api/v1/teams/team1/members/user1', payload: { role: 50 } }).resolves(routeResponse)

            const response = await tool.handler({ teamId: 'team1', userId: 'user1', role: 50 }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('rejects a role outside the team role set', function () {
            tool.inputSchema.role.safeParse(99).success.should.be.false()
            tool.inputSchema.role.safeParse(30).success.should.be.true()
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 403, json: () => ({ code: 'invalid_request' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ teamId: 'team1', userId: 'user1', role: 30 }, { inject })
            response.should.equal(errorResponse)
        })
    })

    describe('platform_invite_team_member', function () {
        const tool = getTool('platform_invite_team_member')

        it('posts the invitation payload and returns the response', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ status: 'okay' }) }
            inject.withArgs({ method: 'POST', url: '/api/v1/teams/team1/invitations', payload: { user: 'alice, bob@example.com', role: 10 } }).resolves(routeResponse)

            const response = await tool.handler({ teamId: 'team1', user: 'alice, bob@example.com', role: 10 }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('omits role from the payload when not provided', async function () {
            inject.resolves({ statusCode: 200, json: () => ({ status: 'okay' }) })

            await tool.handler({ teamId: 'team1', user: 'alice' }, { inject })

            inject.firstCall.args[0].payload.should.eql({ user: 'alice' })
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 429, json: () => ({ code: 'too_many_invites' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ teamId: 'team1', user: 'a,b,c,d,e,f' }, { inject })
            response.should.equal(errorResponse)
        })
    })

    describe('platform_resend_team_invitation', function () {
        const tool = getTool('platform_resend_team_invitation')

        it('posts to the invitation route without a payload', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ id: 'invite1' }) }
            inject.withArgs({ method: 'POST', url: '/api/v1/teams/team1/invitations/invite1' }).resolves(routeResponse)

            const response = await tool.handler({ teamId: 'team1', invitationId: 'invite1' }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ teamId: 'team1', invitationId: 'invite1' }, { inject })
            response.should.equal(errorResponse)
        })
    })
})
