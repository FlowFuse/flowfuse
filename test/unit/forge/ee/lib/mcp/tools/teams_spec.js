const should = require('should') // eslint-disable-line no-unused-vars
const sinon = require('sinon')

const { expectToolMatchesRoute, createExpertMcpToken, toolFinder, recordingInject } = require('../../../../../../lib/mcpToolEquivalence')

const FF_UTIL = require('flowforge-test-utils')

const tools = FF_UTIL.require('forge/ee/lib/mcp/tools/teams')
const { basePaginationKeys, searchQueryKeys, auditLogFilterKeys } = FF_UTIL.require('forge/ee/lib/mcp/schemas')
const findTool = toolFinder(tools)

// audit-log routes honor cursor+limit, free-text query, and event/username.
// The team routes also honor scope + includeChildren.
const auditLogKeys = [...basePaginationKeys, ...searchQueryKeys, ...auditLogFilterKeys]
const auditLogScopedKeys = [...auditLogKeys, 'scope', 'includeChildren']

function jsonResponse (statusCode, body) {
    return { statusCode, json: () => body }
}

describe('MCP teams tools', function () {
    it('exposes exactly the expected tool names', function () {
        tools.map(t => t.name).should.eql([
            'platform_list_teams',
            'platform_get_team',
            'platform_get_team_by_slug',
            'platform_get_team_instance_counts',
            'platform_check_team_slug_availability',
            'platform_get_team_membership',
            'platform_list_team_members',
            'platform_list_team_invitations',
            'platform_get_team_audit_log',
            'platform_export_team_audit_log',
            'platform_list_team_databases',
            'platform_get_team_database',
            'platform_list_database_tables',
            'platform_get_database_table',
            'platform_query_database_table_data',
            'platform_list_team_npm_packages',
            'platform_list_team_git_tokens',
            'platform_list_library_entries'
        ])
    })

    it('every tool is annotated as read-only and non-destructive', function () {
        tools.forEach(tool => {
            tool.annotations.should.have.property('readOnlyHint', true)
            tool.annotations.should.have.property('destructiveHint', false)
        })
    })

    describe('platform_list_teams', function () {
        const tool = findTool('platform_list_teams')

        it('has no input params', function () {
            Object.keys(tool.inputSchema).should.eql([])
        })

        it('calls GET /api/v1/user/teams', async function () {
            const { calls, inject } = recordingInject()
            await tool.handler({}, { inject })
            calls.should.have.length(1)
            calls[0].method.should.equal('GET')
            calls[0].url.should.equal('/api/v1/user/teams')
        })
    })

    describe('platform_get_team', function () {
        const tool = findTool('platform_get_team')

        it('has the teamId input', function () {
            Object.keys(tool.inputSchema).should.eql(['teamId'])
        })

        it('calls GET /api/v1/teams/:teamId', async function () {
            const { calls, inject } = recordingInject()
            await tool.handler({ teamId: 'team1' }, { inject })
            calls[0].method.should.equal('GET')
            calls[0].url.should.equal('/api/v1/teams/team1')
        })
    })

    describe('platform_get_team_by_slug', function () {
        const tool = findTool('platform_get_team_by_slug')

        it('has the teamSlug input', function () {
            Object.keys(tool.inputSchema).should.eql(['teamSlug'])
        })

        it('calls GET /api/v1/teams/slug/:teamSlug', async function () {
            const { calls, inject } = recordingInject()
            await tool.handler({ teamSlug: 'my-team' }, { inject })
            calls[0].method.should.equal('GET')
            calls[0].url.should.equal('/api/v1/teams/slug/my-team')
        })
    })

    describe('platform_get_team_instance_counts', function () {
        const tool = findTool('platform_get_team_instance_counts')

        it('has the expected input params', function () {
            Object.keys(tool.inputSchema).should.eql(['teamId', 'instanceType', 'state', 'applicationId'])
        })

        it('serialises a state array as repeated params', async function () {
            const { calls, inject } = recordingInject()
            await tool.handler({ teamId: 'team1', instanceType: 'hosted', state: ['running', 'stopped'] }, { inject })
            calls[0].method.should.equal('GET')
            calls[0].url.should.equal('/api/v1/teams/team1/instance-counts?instanceType=hosted&state=running&state=stopped')
        })

        it('includes applicationId when set and omits state when not provided', async function () {
            const { calls, inject } = recordingInject()
            await tool.handler({ teamId: 'team1', instanceType: 'remote', applicationId: 'app1' }, { inject })
            calls[0].url.should.equal('/api/v1/teams/team1/instance-counts?instanceType=remote&applicationId=app1')
        })
    })

    describe('platform_check_team_slug_availability', function () {
        const tool = findTool('platform_check_team_slug_availability')

        it('has the slug input', function () {
            Object.keys(tool.inputSchema).should.eql(['slug'])
        })

        it('calls POST /api/v1/teams/check-slug with the slug payload', async function () {
            const { calls, inject } = recordingInject()
            await tool.handler({ slug: 'my-team' }, { inject })
            calls[0].method.should.equal('POST')
            calls[0].url.should.equal('/api/v1/teams/check-slug')
            calls[0].payload.should.eql({ slug: 'my-team' })
        })
    })

    describe('platform_get_team_membership', function () {
        const tool = findTool('platform_get_team_membership')

        it('has the teamId input', function () {
            Object.keys(tool.inputSchema).should.eql(['teamId'])
        })

        it('calls GET /api/v1/teams/:teamId/user', async function () {
            const { calls, inject } = recordingInject()
            await tool.handler({ teamId: 'team1' }, { inject })
            calls.should.have.length(1)
            calls[0].method.should.equal('GET')
            calls[0].url.should.equal('/api/v1/teams/team1/user')
        })
    })

    describe('platform_list_team_members', function () {
        const tool = findTool('platform_list_team_members')

        it('has the teamId input', function () {
            Object.keys(tool.inputSchema).should.eql(['teamId'])
        })

        it('calls GET /api/v1/teams/:teamId/members', async function () {
            const { calls, inject } = recordingInject()
            await tool.handler({ teamId: 'team1' }, { inject })
            calls[0].method.should.equal('GET')
            calls[0].url.should.equal('/api/v1/teams/team1/members')
        })
    })

    describe('platform_list_team_invitations', function () {
        const tool = findTool('platform_list_team_invitations')

        it('has the teamId input', function () {
            Object.keys(tool.inputSchema).should.eql(['teamId'])
        })

        it('calls GET /api/v1/teams/:teamId/invitations', async function () {
            const { calls, inject } = recordingInject()
            await tool.handler({ teamId: 'team1' }, { inject })
            calls[0].method.should.equal('GET')
            calls[0].url.should.equal('/api/v1/teams/team1/invitations')
        })
    })

    describe('team audit-log tools', function () {
        function stubInject (response = { statusCode: 200, json: () => ({}) }) {
            return sinon.stub().resolves(response)
        }

        const toolDefinitions = [
            {
                name: 'platform_get_team_audit_log',
                base: id => `/api/v1/teams/${id}/audit-log`
            },
            {
                name: 'platform_export_team_audit_log',
                base: id => `/api/v1/teams/${id}/audit-log/export`
            }
        ]

        toolDefinitions.forEach(def => {
            describe(def.name, function () {
                it('exposes the expected inputSchema keys', function () {
                    const tool = findTool(def.name)
                    const expectedKeys = ['teamId', ...auditLogScopedKeys]
                    Object.keys(tool.inputSchema).sort().should.deepEqual(expectedKeys.sort())
                })

                it('calls inject with the correct method and bare URL when no query params are given', async function () {
                    const tool = findTool(def.name)
                    const inject = stubInject()
                    await tool.handler({ teamId: 'abc123' }, { inject })
                    inject.calledOnce.should.be.true()
                    const call = inject.firstCall.args[0]
                    call.method.should.equal('GET')
                    call.url.should.equal(def.base('abc123'))
                })

                it('serialises pagination params onto the URL', async function () {
                    const tool = findTool(def.name)
                    const inject = stubInject()
                    await tool.handler({ teamId: 'abc123', limit: 10 }, { inject })
                    const call = inject.firstCall.args[0]
                    call.url.should.equal(`${def.base('abc123')}?limit=10`)
                })
            })
        })

        it('serialises an array `event` filter as one repeated query param per element', async function () {
            const tool = findTool('platform_get_team_audit_log')
            const inject = stubInject()
            await tool.handler({ teamId: 'team1', event: ['user.login', 'user.logout'], limit: 5 }, { inject })
            const call = inject.firstCall.args[0]
            call.url.should.equal('/api/v1/teams/team1/audit-log?limit=5&event=user.login&event=user.logout')
        })

        it('serialises the `username` filter alongside other query params', async function () {
            const tool = findTool('platform_get_team_audit_log')
            const inject = stubInject()
            await tool.handler({ teamId: 'team1', username: 'alice', limit: 20 }, { inject })
            const call = inject.firstCall.args[0]
            call.url.should.equal('/api/v1/teams/team1/audit-log?limit=20&username=alice')
        })

        it('serialises the scope and includeChildren filters', async function () {
            const tool = findTool('platform_get_team_audit_log')
            const inject = stubInject()
            await tool.handler({ teamId: 'team1', scope: 'application', includeChildren: true }, { inject })
            const call = inject.firstCall.args[0]
            call.url.should.equal('/api/v1/teams/team1/audit-log?scope=application&includeChildren=true')
        })
    })

    describe('platform_list_team_databases', function () {
        const tool = findTool('platform_list_team_databases')

        it('declares the expected inputSchema keys', function () {
            Object.keys(tool.inputSchema).should.eql(['teamId'])
        })

        it('calls GET on the team databases endpoint', async function () {
            const { calls, inject } = recordingInject(jsonResponse(200, []))
            await tool.handler({ teamId: 'team1' }, { inject })
            calls.should.have.length(1)
            calls[0].method.should.equal('GET')
            calls[0].url.should.equal('/api/v1/teams/team1/databases')
        })

        it('strips credentials from each database in the result', async function () {
            const { inject } = recordingInject(jsonResponse(200, [
                { id: 'db1', name: 'db-one', credentials: { user: 'u', password: 'secret' } }
            ]))
            const result = await tool.handler({ teamId: 'team1' }, { inject })
            result.statusCode.should.equal(200)
            result.json().should.eql([{ id: 'db1', name: 'db-one' }])
        })

        it('passes error responses through unchanged', async function () {
            const errorResponse = jsonResponse(404, { code: 'not_found', error: 'Not Found - not available on team' })
            const { inject } = recordingInject(errorResponse)
            const result = await tool.handler({ teamId: 'team1' }, { inject })
            result.should.equal(errorResponse)
        })
    })

    describe('platform_get_team_database', function () {
        const tool = findTool('platform_get_team_database')

        it('declares the expected inputSchema keys', function () {
            Object.keys(tool.inputSchema).should.eql(['teamId', 'databaseId'])
        })

        it('calls GET on the single database endpoint', async function () {
            const { calls, inject } = recordingInject(jsonResponse(200, { id: 'db1', name: 'db-one', credentials: { password: 'secret' } }))
            await tool.handler({ teamId: 'team1', databaseId: 'db1' }, { inject })
            calls[0].method.should.equal('GET')
            calls[0].url.should.equal('/api/v1/teams/team1/databases/db1')
        })

        it('strips credentials from the result', async function () {
            const { inject } = recordingInject(jsonResponse(200, { id: 'db1', name: 'db-one', credentials: { password: 'secret' } }))
            const result = await tool.handler({ teamId: 'team1', databaseId: 'db1' }, { inject })
            result.json().should.eql({ id: 'db1', name: 'db-one' })
        })

        it('passes error responses through unchanged', async function () {
            const errorResponse = jsonResponse(404, { code: 'not_found', error: 'Not Found' })
            const { inject } = recordingInject(errorResponse)
            const result = await tool.handler({ teamId: 'team1', databaseId: 'db1' }, { inject })
            result.should.equal(errorResponse)
        })

        it('returns a falsy body unchanged without attempting to strip credentials', async function () {
            const { inject } = recordingInject(jsonResponse(200, null))
            const result = await tool.handler({ teamId: 'team1', databaseId: 'db1' }, { inject })
            should.equal(result.json(), null)
        })
    })

    describe('platform_list_database_tables', function () {
        const tool = findTool('platform_list_database_tables')

        it('declares the expected inputSchema keys', function () {
            Object.keys(tool.inputSchema).should.eql(['teamId', 'databaseId'])
        })

        it('calls GET on the tables endpoint (this endpoint does not paginate)', async function () {
            const { calls, inject } = recordingInject(jsonResponse(200, { count: 0, tables: [] }))
            await tool.handler({ teamId: 'team1', databaseId: 'db1' }, { inject })
            calls[0].method.should.equal('GET')
            calls[0].url.should.equal('/api/v1/teams/team1/databases/db1/tables')
        })

        it('returns the response unchanged', async function () {
            const response = jsonResponse(200, { count: 0, tables: [] })
            const { inject } = recordingInject(response)
            const result = await tool.handler({ teamId: 'team1', databaseId: 'db1' }, { inject })
            result.should.equal(response)
        })
    })

    describe('platform_get_database_table', function () {
        const tool = findTool('platform_get_database_table')

        it('declares the expected inputSchema keys', function () {
            Object.keys(tool.inputSchema).should.eql(['teamId', 'databaseId', 'tableName'])
        })

        it('calls GET on the table schema endpoint', async function () {
            const response = jsonResponse(200, { name: 'users', schema: 'CREATE TABLE users (...)' })
            const { calls, inject } = recordingInject(response)
            const result = await tool.handler({ teamId: 'team1', databaseId: 'db1', tableName: 'users' }, { inject })
            calls[0].method.should.equal('GET')
            calls[0].url.should.equal('/api/v1/teams/team1/databases/db1/tables/users')
            result.should.equal(response)
        })
    })

    describe('platform_query_database_table_data', function () {
        const tool = findTool('platform_query_database_table_data')

        it('declares the expected inputSchema keys', function () {
            Object.keys(tool.inputSchema).should.eql(['teamId', 'databaseId', 'tableName', 'limit'])
        })

        it('serialises the limit param onto the data endpoint URL', async function () {
            const { calls, inject } = recordingInject(jsonResponse(200, { count: 0, rows: [] }))
            await tool.handler({ teamId: 'team1', databaseId: 'db1', tableName: 'users', limit: 5 }, { inject })
            calls[0].method.should.equal('GET')
            calls[0].url.should.equal('/api/v1/teams/team1/databases/db1/tables/users/data?limit=5')
        })

        it('returns the response unchanged', async function () {
            const response = jsonResponse(200, { count: 0, rows: [] })
            const { inject } = recordingInject(response)
            const result = await tool.handler({ teamId: 'team1', databaseId: 'db1', tableName: 'users' }, { inject })
            result.should.equal(response)
        })
    })

    describe('platform_list_team_npm_packages', function () {
        const tool = findTool('platform_list_team_npm_packages')

        it('declares the expected inputSchema keys', function () {
            Object.keys(tool.inputSchema).should.eql(['teamId'])
        })

        it('calls GET on the npm packages endpoint and returns the response unchanged', async function () {
            const response = jsonResponse(200, [{ name: '@team/pkg' }])
            const { calls, inject } = recordingInject(response)
            const result = await tool.handler({ teamId: 'team1' }, { inject })
            calls[0].method.should.equal('GET')
            calls[0].url.should.equal('/api/v1/teams/team1/npm/packages')
            result.should.equal(response)
        })
    })

    describe('platform_list_team_git_tokens', function () {
        const tool = findTool('platform_list_team_git_tokens')

        it('declares the expected inputSchema keys', function () {
            Object.keys(tool.inputSchema).should.eql(['teamId'])
        })

        it('calls GET on the git tokens endpoint and returns the response unchanged', async function () {
            const response = jsonResponse(200, [{ id: 'tok1', name: 'ci-token', type: 'github' }])
            const { calls, inject } = recordingInject(response)
            const result = await tool.handler({ teamId: 'team1' }, { inject })
            calls[0].method.should.equal('GET')
            calls[0].url.should.equal('/api/v1/teams/team1/git/tokens')
            result.should.equal(response)
        })
    })

    describe('platform_list_library_entries', function () {
        const tool = findTool('platform_list_library_entries')

        it('declares the expected inputSchema keys', function () {
            Object.keys(tool.inputSchema).should.eql(['libraryId', 'path', 'type'])
        })

        it('lists the library root when path is empty and no type filter is given', async function () {
            const response = jsonResponse(200, [])
            const { calls, inject } = recordingInject(response)
            const result = await tool.handler({ libraryId: 'team1', path: '' }, { inject })
            calls[0].method.should.equal('GET')
            calls[0].url.should.equal('/storage/library/team1/')
            result.should.equal(response)
        })

        it('lists a folder path and appends the type filter as a query param', async function () {
            const { calls, inject } = recordingInject(jsonResponse(200, []))
            await tool.handler({ libraryId: 'team1', path: 'folder1', type: 'flows' }, { inject })
            calls[0].url.should.equal('/storage/library/team1/folder1?type=flows')
        })
    })
})

describe('MCP teams tools smoke test', function () {
    const setup = require('../../../setup')

    let app
    let token

    before(async function () {
        app = await setup({ ai: { enabled: true }, expert: { enabled: true } })
        // check-slug requires 'team:create', gated behind this setting for non-admin callers like the expert-mcp token below
        await app.settings.set('team:create', true)
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

    describe('tool responses match their backing routes', function () {
        it('platform_list_teams matches GET /api/v1/user/teams', async function () {
            const tool = findTool('platform_list_teams')
            await expectToolMatchesRoute(inject, tool, {}, {
                method: 'GET',
                url: '/api/v1/user/teams'
            })
        })

        it('platform_get_team matches GET /api/v1/teams/:teamId', async function () {
            const tool = findTool('platform_get_team')
            await expectToolMatchesRoute(inject, tool, { teamId: app.team.hashid }, {
                method: 'GET',
                url: `/api/v1/teams/${app.team.hashid}`
            })
        })

        it('platform_get_team_by_slug matches GET /api/v1/teams/slug/:teamSlug', async function () {
            const tool = findTool('platform_get_team_by_slug')
            await expectToolMatchesRoute(inject, tool, { teamSlug: app.team.slug }, {
                method: 'GET',
                url: `/api/v1/teams/slug/${app.team.slug}`
            })
        })

        it('platform_get_team_instance_counts matches GET /api/v1/teams/:teamId/instance-counts', async function () {
            const tool = findTool('platform_get_team_instance_counts')
            await expectToolMatchesRoute(inject, tool, { teamId: app.team.hashid, instanceType: 'hosted' }, {
                method: 'GET',
                url: `/api/v1/teams/${app.team.hashid}/instance-counts?instanceType=hosted`
            })
        })

        it('platform_check_team_slug_availability matches POST /api/v1/teams/check-slug for an available slug', async function () {
            const tool = findTool('platform_check_team_slug_availability')
            await expectToolMatchesRoute(inject, tool, { slug: 'a-brand-new-team-slug' }, {
                method: 'POST',
                url: '/api/v1/teams/check-slug',
                payload: { slug: 'a-brand-new-team-slug' }
            })
        })

        it('platform_check_team_slug_availability matches POST /api/v1/teams/check-slug for a taken slug', async function () {
            const tool = findTool('platform_check_team_slug_availability')
            const { viaTool } = await expectToolMatchesRoute(inject, tool, { slug: app.team.slug }, {
                method: 'POST',
                url: '/api/v1/teams/check-slug',
                payload: { slug: app.team.slug }
            })
            viaTool.statusCode.should.equal(409)
        })

        it('platform_get_team_membership matches GET /api/v1/teams/:teamId/user', async function () {
            const tool = findTool('platform_get_team_membership')
            await expectToolMatchesRoute(inject, tool, { teamId: app.team.hashid }, {
                method: 'GET',
                url: `/api/v1/teams/${app.team.hashid}/user`
            })
        })

        it('platform_list_team_members matches GET /api/v1/teams/:teamId/members', async function () {
            const tool = findTool('platform_list_team_members')
            const { routeResponse } = await expectToolMatchesRoute(inject, tool, { teamId: app.team.hashid }, {
                method: 'GET',
                url: `/api/v1/teams/${app.team.hashid}/members`
            })
            routeResponse.statusCode.should.equal(200)
            routeResponse.json().members.should.not.be.empty()
        })

        it('platform_list_team_invitations matches GET /api/v1/teams/:teamId/invitations', async function () {
            const bob = await app.factory.createUser({
                admin: false,
                username: 'bob-invitee',
                name: 'Bob Invitee',
                email: 'bob-invitee@example.com',
                password: 'bbPassword'
            })
            await app.factory.createInvitation(app.team, app.user, bob)

            const tool = findTool('platform_list_team_invitations')
            const { routeResponse } = await expectToolMatchesRoute(inject, tool, { teamId: app.team.hashid }, {
                method: 'GET',
                url: `/api/v1/teams/${app.team.hashid}/invitations`
            })
            routeResponse.statusCode.should.equal(200)
            routeResponse.json().invitations.should.not.be.empty()
        })
    })
})

describe('MCP teams audit-log tools - integration smoke', function () {
    const setup = require('../../../setup')

    let app
    let token

    before(async function () {
        app = await setup({
            ai: { enabled: true },
            expert: { enabled: true }
        })
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

    it('reads the team audit log via the underlying route', async function () {
        const tool = findTool('platform_get_team_audit_log')

        const response = await tool.handler({ teamId: app.team.hashid }, { inject })

        response.statusCode.should.equal(200)
        const body = response.json()
        body.should.have.property('meta')
        body.should.have.property('count')
        body.should.have.property('log')
        body.log.should.be.an.Array()
    })

    describe('tool-vs-route equivalence', function () {
        let team

        before(async function () {
            team = app.team

            // Seed one real entry so assertions compare actual data, not an empty-list shape.
            await app.db.controllers.AuditLog.teamLog(team.id, app.user.id, 'team.settings.updated', { settings: { name: team.name } })
        })

        it('platform_get_team_audit_log matches GET /api/v1/teams/:teamId/audit-log, including query params', async function () {
            const tool = findTool('platform_get_team_audit_log')
            await expectToolMatchesRoute(inject, tool, { teamId: team.hashid, event: 'team.settings.updated', limit: 5 }, {
                method: 'GET',
                url: `/api/v1/teams/${team.hashid}/audit-log?limit=5&event=team.settings.updated`
            })
        })

        it('platform_export_team_audit_log matches GET /api/v1/teams/:teamId/audit-log/export', async function () {
            const tool = findTool('platform_export_team_audit_log')
            await expectToolMatchesRoute(inject, tool, { teamId: team.hashid }, {
                method: 'GET',
                url: `/api/v1/teams/${team.hashid}/audit-log/export`,
                raw: true
            })
        })
    })
})

describe('MCP teams data tools - integration smoke', function () {
    const setup = require('../../../setup')

    const NPM_REGISTRY_PORT = 9761

    let app
    let token
    let database
    let npmRegistryServer

    const inject = (options) => app.inject({
        ...options,
        headers: {
            ...(options.headers || {}),
            authorization: `Bearer ${token}`
        }
    })

    before(async function () {
        app = await setup({
            ai: { enabled: true },
            expert: { enabled: true },
            tables: {
                enabled: true,
                driver: { type: 'stub' }
            },
            npmRegistry: {
                enabled: true,
                url: `http://localhost:${NPM_REGISTRY_PORT}`,
                admin: { username: 'admin', password: 'secret' }
            }
        })

        // These features are off by default; enable them so the smoke test hits the real 200 path.
        const defaultTeamTypeProperties = app.defaultTeamType.properties
        defaultTeamTypeProperties.features = {
            ...defaultTeamTypeProperties.features,
            tables: true,
            npm: true,
            gitIntegration: true
        }
        app.defaultTeamType.properties = defaultTeamTypeProperties
        await app.defaultTeamType.save()

        token = await createExpertMcpToken(app)

        // Minimal stand-in npm registry (pattern from catalogue/index_spec.js) so we get a real 200 response.
        npmRegistryServer = require('http').createServer((req, res) => {
            if (/^\/-\/all/.test(req.url)) {
                res.writeHead(200, { 'Content-Type': 'application/json' })
                const body = { _updated: 99999 }
                body[`@flowfuse-${app.team.hashid}/one`] = {
                    name: `@flowfuse-${app.team.hashid}/one`,
                    'dist-tags': { latest: '1.0.0' },
                    time: { modified: '2025-02-18T10:13:18.950Z' },
                    license: 'Apache-2.0',
                    versions: { '1.0.0': 'latest' }
                }
                res.end(JSON.stringify(body))
            } else {
                res.writeHead(404)
                res.end()
            }
        })
        await new Promise((resolve) => npmRegistryServer.listen(NPM_REGISTRY_PORT, resolve))

        // Seed at the model layer, not via the create-database route: the stub tables
        // driver keys created-database state by team hashid, which leaks across spec files sharing it.
        database = await app.db.models.Table.create({
            TeamId: app.team.id,
            name: app.team.hashid,
            credentials: {
                host: 'localhost',
                port: 5432,
                database: app.team.hashid,
                user: 'postgres',
                password: 'smoke-test-password',
                ssl: false
            },
            meta: {}
        })

        await app.db.models.GitToken.create({
            name: 'ci-token',
            token: 'ghp_smoketesttoken',
            type: 'github',
            TeamId: app.team.id
        })

        await app.db.models.StorageSharedLibrary.create({
            name: 'smoke-flow',
            type: 'flows',
            meta: JSON.stringify({}),
            body: JSON.stringify([]),
            TeamId: app.team.id
        })
    })

    after(async function () {
        await app.close()
        await new Promise((resolve) => npmRegistryServer.close(resolve))
    })

    it('lists team databases via the same endpoint platform_list_team_databases calls', async function () {
        const response = await inject({ method: 'GET', url: `/api/v1/teams/${app.team.hashid}/databases` })
        response.statusCode.should.equal(200)
        response.json().should.be.an.Array().and.have.length(1)
    })

    it('platform_list_team_databases matches GET /api/v1/teams/:teamId/databases, with credentials stripped from every entry', async function () {
        const tool = findTool('platform_list_team_databases')
        const { viaTool } = await expectToolMatchesRoute(inject, tool, { teamId: app.team.hashid }, {
            method: 'GET',
            url: `/api/v1/teams/${app.team.hashid}/databases`,
            transform: (r) => ({
                statusCode: r.statusCode,
                body: (r.json() || []).map(({ credentials, ...rest }) => rest)
            })
        })
        viaTool.json().should.be.an.Array().and.have.length(1)
        viaTool.json()[0].should.not.have.property('credentials')
    })

    it('platform_get_team_database matches GET /api/v1/teams/:teamId/databases/:databaseId, with credentials stripped', async function () {
        const tool = findTool('platform_get_team_database')
        const { viaTool } = await expectToolMatchesRoute(inject, tool, { teamId: app.team.hashid, databaseId: database.hashid }, {
            method: 'GET',
            url: `/api/v1/teams/${app.team.hashid}/databases/${database.hashid}`,
            transform: (r) => ({
                statusCode: r.statusCode,
                body: (function () {
                    const d = r.json()
                    if (!d) return d
                    const { credentials, ...rest } = d
                    return rest
                })()
            })
        })
        viaTool.json().should.not.have.property('credentials')
    })

    it('platform_list_database_tables matches GET /api/v1/teams/:teamId/databases/:databaseId/tables', async function () {
        const tool = findTool('platform_list_database_tables')
        await expectToolMatchesRoute(inject, tool, { teamId: app.team.hashid, databaseId: database.hashid }, {
            method: 'GET',
            url: `/api/v1/teams/${app.team.hashid}/databases/${database.hashid}/tables`
        })
    })

    it('platform_get_database_table matches GET /api/v1/teams/:teamId/databases/:databaseId/tables/:tableName', async function () {
        const tool = findTool('platform_get_database_table')
        await expectToolMatchesRoute(inject, tool, { teamId: app.team.hashid, databaseId: database.hashid, tableName: 'table1' }, {
            method: 'GET',
            url: `/api/v1/teams/${app.team.hashid}/databases/${database.hashid}/tables/table1`
        })
    })

    it('platform_query_database_table_data matches GET /api/v1/teams/:teamId/databases/:databaseId/tables/:tableName/data', async function () {
        const tool = findTool('platform_query_database_table_data')
        await expectToolMatchesRoute(inject, tool, { teamId: app.team.hashid, databaseId: database.hashid, tableName: 'table1' }, {
            method: 'GET',
            url: `/api/v1/teams/${app.team.hashid}/databases/${database.hashid}/tables/table1/data`
        })
    })

    it('platform_list_team_npm_packages matches GET /api/v1/teams/:teamId/npm/packages', async function () {
        const tool = findTool('platform_list_team_npm_packages')
        const { viaTool } = await expectToolMatchesRoute(inject, tool, { teamId: app.team.hashid }, {
            method: 'GET',
            url: `/api/v1/teams/${app.team.hashid}/npm/packages`
        })
        viaTool.statusCode.should.equal(200)
        viaTool.json().should.have.property(`@flowfuse-${app.team.hashid}/one`)
    })

    it('platform_list_team_git_tokens matches GET /api/v1/teams/:teamId/git/tokens', async function () {
        const tool = findTool('platform_list_team_git_tokens')
        const { viaTool } = await expectToolMatchesRoute(inject, tool, { teamId: app.team.hashid }, {
            method: 'GET',
            url: `/api/v1/teams/${app.team.hashid}/git/tokens`
        })
        viaTool.statusCode.should.equal(200)
        viaTool.json().tokens.should.be.an.Array().and.have.length(1)
        viaTool.json().tokens[0].should.have.property('name', 'ci-token')
    })

    it('platform_list_library_entries matches GET /storage/library/:libraryId/', async function () {
        const tool = findTool('platform_list_library_entries')
        const { viaTool } = await expectToolMatchesRoute(inject, tool, { libraryId: app.team.hashid, path: '' }, {
            method: 'GET',
            url: `/storage/library/${app.team.hashid}/`
        })
        viaTool.statusCode.should.equal(200)
        viaTool.json().should.be.an.Array().and.have.length(1)
        viaTool.json()[0].should.have.property('fn', 'smoke-flow')
    })
})
