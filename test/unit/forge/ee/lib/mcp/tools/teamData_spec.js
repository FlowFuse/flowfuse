const should = require('should') // eslint-disable-line no-unused-vars

const { toolFinder, recordingInject, expectToolMatchesRoute, createExpertMcpToken } = require('../../../../../../lib/mcpToolEquivalence')

const FF_UTIL = require('flowforge-test-utils')

const tools = FF_UTIL.require('forge/ee/lib/mcp/tools/teamData')

const findTool = toolFinder(tools)

function jsonResponse (statusCode, body) {
    return { statusCode, json: () => body }
}

describe('MCP Team Data Tools', function () {
    describe('platform_list_team_databases', function () {
        const tool = findTool('platform_list_team_databases')

        it('is read-only and non-destructive', function () {
            tool.annotations.readOnlyHint.should.equal(true)
            tool.annotations.destructiveHint.should.equal(false)
        })

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

        it('is read-only and non-destructive', function () {
            tool.annotations.readOnlyHint.should.equal(true)
            tool.annotations.destructiveHint.should.equal(false)
        })

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

        it('is read-only and non-destructive', function () {
            tool.annotations.readOnlyHint.should.equal(true)
            tool.annotations.destructiveHint.should.equal(false)
        })

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

        it('is read-only and non-destructive', function () {
            tool.annotations.readOnlyHint.should.equal(true)
            tool.annotations.destructiveHint.should.equal(false)
        })

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

        it('is read-only and non-destructive', function () {
            tool.annotations.readOnlyHint.should.equal(true)
            tool.annotations.destructiveHint.should.equal(false)
        })

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

        it('is read-only and non-destructive', function () {
            tool.annotations.readOnlyHint.should.equal(true)
            tool.annotations.destructiveHint.should.equal(false)
        })

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

        it('is read-only and non-destructive', function () {
            tool.annotations.readOnlyHint.should.equal(true)
            tool.annotations.destructiveHint.should.equal(false)
        })

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

        it('is read-only and non-destructive', function () {
            tool.annotations.readOnlyHint.should.equal(true)
            tool.annotations.destructiveHint.should.equal(false)
        })

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

describe('MCP Team Data Tools - integration smoke', function () {
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
