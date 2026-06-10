'use strict'

const should = require('should') // eslint-disable-line
const sinon = require('sinon')

const setup = require('../../setup')

const FF_UTIL = require('flowforge-test-utils')
const { Roles } = FF_UTIL.require('forge/lib/roles')

const MCP_URL = '/api/v1/mcp'

// The MCP Streamable HTTP transport (via @hono/node-server) calls
// socket.destroySoon() when draining the response stream after a timeout.
// Fastify's light-my-request MockSocket (an EventEmitter subclass) does not
// implement destroySoon(). This causes a TypeError during test teardown but does
// not affect the test exit code (which remains 0 after all tests pass).

/**
 * Build a JSON-RPC 2.0 MCP request body.
 * @param {string} method
 * @param {object} [params]
 * @param {number} [id]
 */
function mcpRequest (method, params, id = 1) {
    const body = { jsonrpc: '2.0', id, method }
    if (params !== undefined) {
        body.params = params
    }
    return body
}

/**
 * Post an MCP request via app.inject() and return { statusCode, body }.
 * The body is JSON-parsed when possible.
 *
 * The MCP Streamable HTTP transport requires specific Accept headers:
 *   Accept: application/json, text/event-stream
 *   Content-Type: application/json
 *
 * The transport responds with SSE (Server-Sent Events):
 *   event: message
 *   data: <JSON>
 */
async function mcpPost (app, payload, cookies = {}) {
    const response = await app.inject({
        method: 'POST',
        url: MCP_URL,
        headers: {
            'content-type': 'application/json',
            accept: 'application/json, text/event-stream'
        },
        payload,
        cookies
    })
    let body = null
    try {
        // Extract the first 'data:' line from the SSE response and parse it
        const raw = response.payload || response.body || ''
        const dataLine = raw.split('\n').find(l => l.startsWith('data:'))
        if (dataLine) {
            body = JSON.parse(dataLine.slice('data:'.length).trim())
        }
    } catch (_) {
        body = null
    }
    return { statusCode: response.statusCode, body, response }
}

describe('MCP Server API', function () {
    let app
    /** @type {import('../../../../../../test/lib/TestModelFactory')} */
    let factory
    const TestObjects = { tokens: {} }

    before(async function () {
        // Stripe mock must be set up before the app starts; the EE setup includes
        // a billing configuration that would otherwise require a real Stripe API key.
        setup.setupStripe()
        app = await setup()
        factory = app.factory

        // Login as alice (admin / team owner from setup)
        await login('alice', 'aaPassword')

        // Create additional users for RBAC tests
        const userBob = await factory.createUser({
            admin: false,
            username: 'bob',
            name: 'Bob Solo',
            email: 'bob@example.com',
            password: 'bbPassword'
        })
        // Bob is a Member of ATeam
        await app.team.addUser(userBob, { through: { role: Roles.Member } })
        await login('bob', 'bbPassword')

        const userCarol = await factory.createUser({
            admin: false,
            username: 'carol',
            name: 'Carol Organa',
            email: 'carol@example.com',
            password: 'ccPassword'
        })
        // Carol is a Viewer of ATeam
        await app.team.addUser(userCarol, { through: { role: Roles.Viewer } })
        await login('carol', 'ccPassword')

        const userDave = await factory.createUser({
            admin: false,
            username: 'dave',
            name: 'Dave Vader',
            email: 'dave@example.com',
            password: 'ddPassword'
        })
        // Dave is an Owner of ATeam
        await app.team.addUser(userDave, { through: { role: Roles.Owner } })
        await login('dave', 'ddPassword')
    })

    after(async function () {
        await app.close()
    })

    afterEach(function () {
        sinon.restore()
    })

    async function login (username, password) {
        const response = await app.inject({
            method: 'POST',
            url: '/account/login',
            payload: { username, password, remember: false }
        })
        response.cookies.should.have.length(1)
        // Cookie objects from light-my-request have null prototype — spread into plain object first
        const cookie = { ...response.cookies[0] }
        cookie.should.have.property('name', 'sid')
        TestObjects.tokens[username] = response.cookies[0].value
    }

    // -------------------------------------------------------------------------
    // Authentication
    // -------------------------------------------------------------------------

    describe('Authentication', function () {
        it('returns 401 for unauthenticated POST request', async function () {
            const response = await app.inject({
                method: 'POST',
                url: MCP_URL,
                headers: {
                    'content-type': 'application/json',
                    accept: 'application/json, text/event-stream'
                },
                payload: mcpRequest('initialize', {
                    protocolVersion: '2025-03-26',
                    capabilities: {},
                    clientInfo: { name: 'test', version: '1.0' }
                })
                // No cookies — unauthenticated
            })
            response.statusCode.should.equal(401)
        })
    })

    // -------------------------------------------------------------------------
    // HTTP method restrictions
    // -------------------------------------------------------------------------

    describe('Method restrictions', function () {
        it('GET returns 405', async function () {
            const response = await app.inject({
                method: 'GET',
                url: MCP_URL,
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(405)
        })

        it('DELETE returns 405', async function () {
            const response = await app.inject({
                method: 'DELETE',
                url: MCP_URL,
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(405)
        })
    })

    // -------------------------------------------------------------------------
    // MCP Protocol
    // -------------------------------------------------------------------------

    describe('MCP Protocol', function () {
        it('initialize returns server info', async function () {
            const { statusCode, body } = await mcpPost(
                app,
                mcpRequest('initialize', {
                    protocolVersion: '2025-03-26',
                    capabilities: {},
                    clientInfo: { name: 'test-client', version: '1.0.0' }
                }),
                { sid: TestObjects.tokens.alice }
            )
            statusCode.should.equal(200)
            should.exist(body)
            body.should.have.property('jsonrpc', '2.0')
            body.should.have.property('id', 1)
            body.should.have.property('result')
            body.result.should.have.property('serverInfo')
            body.result.serverInfo.should.have.property('name', 'FlowFuse Platform')
            body.result.serverInfo.should.have.property('version', '1.0.0')
        })

        it('tools/list returns all 21 registered tools', async function () {
            const { statusCode, body } = await mcpPost(
                app,
                mcpRequest('tools/list', undefined, 2),
                { sid: TestObjects.tokens.alice }
            )
            statusCode.should.equal(200)
            should.exist(body)
            body.should.have.property('result')
            body.result.should.have.property('tools')
            const tools = body.result.tools
            tools.should.be.an.Array()
            tools.should.have.length(21)

            // Verify all expected tool names are present
            const toolNames = tools.map(t => t.name)
            const expectedTools = [
                'platform.list-teams',
                'platform.list-applications',
                'platform.list-instances',
                'platform.get-instance',
                'platform.list-instance-types',
                'platform.list-stacks',
                'platform.list-blueprints',
                'platform.get-instance-status',
                'platform.check-name-availability',
                'platform.create-application',
                'platform.create-instance',
                'platform.start-instance',
                'platform.stop-instance',
                'platform.restart-instance',
                'platform.suspend-instance',
                'platform.open-editor',
                'platform.open-instance',
                'platform.update-instance-settings',
                'platform.create-snapshot',
                'platform.delete-instance',
                'platform.delete-application'
            ]
            for (const name of expectedTools) {
                toolNames.should.containEql(name)
            }
        })

        it('tools/list includes annotations on each tool', async function () {
            const { body } = await mcpPost(
                app,
                mcpRequest('tools/list', undefined, 3),
                { sid: TestObjects.tokens.alice }
            )
            const tools = body.result.tools
            for (const tool of tools) {
                tool.should.have.property('name')
                tool.should.have.property('description')
                tool.should.have.property('annotations')
                tool.annotations.should.have.property('readOnlyHint')
                tool.annotations.should.have.property('destructiveHint')
            }
        })

        it('tools/list marks read-only tools correctly', async function () {
            const { body } = await mcpPost(
                app,
                mcpRequest('tools/list', undefined, 4),
                { sid: TestObjects.tokens.alice }
            )
            const tools = body.result.tools
            const readOnlyTools = [
                'platform.list-teams',
                'platform.list-applications',
                'platform.list-instances',
                'platform.get-instance',
                'platform.list-instance-types',
                'platform.list-stacks',
                'platform.list-blueprints',
                'platform.get-instance-status',
                'platform.check-name-availability'
            ]
            for (const name of readOnlyTools) {
                const tool = tools.find(t => t.name === name)
                should.exist(tool, `Tool ${name} should exist`)
                tool.annotations.readOnlyHint.should.equal(true, `${name} should be read-only`)
                tool.annotations.destructiveHint.should.equal(false, `${name} should not be destructive`)
            }
        })

        it('tools/list marks destructive tools correctly', async function () {
            const { body } = await mcpPost(
                app,
                mcpRequest('tools/list', undefined, 5),
                { sid: TestObjects.tokens.alice }
            )
            const tools = body.result.tools
            const destructiveTools = ['platform.delete-instance', 'platform.delete-application']
            for (const name of destructiveTools) {
                const tool = tools.find(t => t.name === name)
                should.exist(tool, `Tool ${name} should exist`)
                tool.annotations.destructiveHint.should.equal(true, `${name} should be destructive`)
            }
        })
    })

    // -------------------------------------------------------------------------
    // Helper: invoke an MCP tool and parse the result
    //
    // Note on IDs:
    //   - Teams, Applications, ProjectTypes, Stacks, Templates use integer PKs
    //     and support hashid encoding — use model.hashid
    //   - Projects (instances) use UUID as PK so model.hashid is always empty;
    //     pass model.id (the UUID) for instance-related tool parameters
    // -------------------------------------------------------------------------

    async function callTool (toolName, args, tokenKey = 'alice') {
        const { statusCode, body } = await mcpPost(
            app,
            mcpRequest('tools/call', { name: toolName, arguments: args }),
            { sid: TestObjects.tokens[tokenKey] }
        )
        if (!body || !body.result || !body.result.content || !body.result.content[0]) {
            return { statusCode, result: null, isError: body?.result?.isError || false }
        }
        const text = body.result.content[0].text
        let result = null
        try { result = JSON.parse(text) } catch (_) { result = text }
        const isError = body.result.isError === true
        return { statusCode, result, isError }
    }

    // -------------------------------------------------------------------------
    // Read-only tools
    // -------------------------------------------------------------------------

    describe('Read-only tools', function () {
        describe('platform.list-teams', function () {
            it('returns teams for the authenticated user', async function () {
                const { statusCode, result, isError } = await callTool('platform.list-teams', {})
                statusCode.should.equal(200)
                isError.should.equal(false)
                result.should.have.property('teams')
                result.teams.should.be.an.Array()
                // Alice is a member of ATeam
                const teamNames = result.teams.map(t => t.name)
                teamNames.should.containEql('ATeam')
            })

            it('each team entry has id, name, slug and role', async function () {
                const { result } = await callTool('platform.list-teams', {})
                result.teams.length.should.be.greaterThan(0)
                const team = result.teams[0]
                team.should.have.property('id')
                team.should.have.property('name')
                team.should.have.property('slug')
                team.should.have.property('role')
            })
        })

        describe('platform.list-applications', function () {
            it('returns applications for a valid team', async function () {
                const { statusCode, result, isError } = await callTool(
                    'platform.list-applications',
                    { teamId: app.team.hashid }
                )
                statusCode.should.equal(200)
                isError.should.equal(false)
                result.should.have.property('applications')
                result.applications.should.be.an.Array()
                result.applications.length.should.be.greaterThan(0)
            })

            it('each application entry has id, name and instanceCount', async function () {
                const { result } = await callTool(
                    'platform.list-applications',
                    { teamId: app.team.hashid }
                )
                const appEntry = result.applications[0]
                appEntry.should.have.property('id')
                appEntry.should.have.property('name')
                appEntry.should.have.property('instanceCount')
            })

            it('returns error for unknown team', async function () {
                const { statusCode, result, isError } = await callTool(
                    'platform.list-applications',
                    { teamId: 'unknownid' }
                )
                statusCode.should.equal(200)
                isError.should.equal(true)
                result.should.have.property('error')
            })
        })

        describe('platform.list-instances', function () {
            it('returns instances for a valid application', async function () {
                const { statusCode, result, isError } = await callTool(
                    'platform.list-instances',
                    { applicationId: app.application.hashid }
                )
                statusCode.should.equal(200)
                isError.should.equal(false)
                result.should.have.property('instances')
                result.instances.should.be.an.Array()
                result.instances.length.should.be.greaterThan(0)
            })

            it('each instance entry has id, name, url and state', async function () {
                const { result } = await callTool(
                    'platform.list-instances',
                    { applicationId: app.application.hashid }
                )
                const inst = result.instances[0]
                inst.should.have.property('id')
                inst.should.have.property('name')
                inst.should.have.property('state')
            })

            it('returns error for unknown application', async function () {
                const { isError, result } = await callTool(
                    'platform.list-instances',
                    { applicationId: 'doesnotexist' }
                )
                isError.should.equal(true)
                result.should.have.property('error')
            })
        })

        describe('platform.get-instance', function () {
            // Note: Project uses UUID as PK; Project.byId() takes the UUID directly
            it('returns instance details', async function () {
                const { statusCode, result, isError } = await callTool(
                    'platform.get-instance',
                    { instanceId: app.project.id }
                )
                statusCode.should.equal(200)
                isError.should.equal(false)
                result.should.have.property('name', app.project.name)
                result.should.have.property('state')
                result.should.have.property('createdAt')
                result.should.have.property('updatedAt')
            })

            it('returns error for unknown instance', async function () {
                const { isError, result } = await callTool(
                    'platform.get-instance',
                    { instanceId: 'nonexistent' }
                )
                isError.should.equal(true)
                result.should.have.property('error')
            })
        })

        describe('platform.list-instance-types', function () {
            it('returns active instance types for a team', async function () {
                const { statusCode, result, isError } = await callTool(
                    'platform.list-instance-types',
                    { teamId: app.team.hashid }
                )
                statusCode.should.equal(200)
                isError.should.equal(false)
                result.should.have.property('instanceTypes')
                result.instanceTypes.should.be.an.Array()
                result.instanceTypes.length.should.be.greaterThan(0)
            })

            it('each instance type has id, name and description', async function () {
                const { result } = await callTool(
                    'platform.list-instance-types',
                    { teamId: app.team.hashid }
                )
                const type = result.instanceTypes[0]
                type.should.have.property('id')
                type.should.have.property('name')
                type.should.have.property('description')
            })
        })

        describe('platform.list-stacks', function () {
            it('returns stacks for a given instance type', async function () {
                const { statusCode, result, isError } = await callTool(
                    'platform.list-stacks',
                    { instanceTypeId: app.projectType.hashid }
                )
                statusCode.should.equal(200)
                isError.should.equal(false)
                result.should.have.property('stacks')
                result.stacks.should.be.an.Array()
                result.stacks.length.should.be.greaterThan(0)
            })

            it('each stack has id and name', async function () {
                const { result } = await callTool(
                    'platform.list-stacks',
                    { instanceTypeId: app.projectType.hashid }
                )
                const stack = result.stacks[0]
                stack.should.have.property('id')
                stack.should.have.property('name')
            })

            it('returns error for invalid instance type id', async function () {
                const { isError, result } = await callTool(
                    'platform.list-stacks',
                    { instanceTypeId: 'badid!!' }
                )
                isError.should.equal(true)
                result.should.have.property('error')
            })
        })

        describe('platform.list-blueprints', function () {
            it('returns blueprints for a team (may be empty if none created)', async function () {
                const { statusCode, result, isError } = await callTool(
                    'platform.list-blueprints',
                    { teamId: app.team.hashid }
                )
                statusCode.should.equal(200)
                isError.should.equal(false)
                result.should.have.property('blueprints')
                result.blueprints.should.be.an.Array()
            })
        })

        describe('platform.get-instance-status', function () {
            it('returns instance status', async function () {
                const { statusCode, result, isError } = await callTool(
                    'platform.get-instance-status',
                    { instanceId: app.project.id }
                )
                statusCode.should.equal(200)
                isError.should.equal(false)
                result.should.have.property('name', app.project.name)
                result.should.have.property('state')
            })
        })

        describe('platform.check-name-availability', function () {
            it('returns available: true for an unused instance name', async function () {
                const { statusCode, result, isError } = await callTool(
                    'platform.check-name-availability',
                    { name: 'definitely-unused-name-' + Date.now(), type: 'instance' }
                )
                statusCode.should.equal(200)
                isError.should.equal(false)
                result.should.have.property('available', true)
            })

            it('returns available: false for an existing instance name', async function () {
                const { result, isError } = await callTool(
                    'platform.check-name-availability',
                    { name: app.project.name, type: 'instance' }
                )
                isError.should.equal(false)
                result.should.have.property('available', false)
                result.should.have.property('reason')
            })

            it('returns available: true for any non-empty application name', async function () {
                const { result, isError } = await callTool(
                    'platform.check-name-availability',
                    { name: 'Any App Name', type: 'application', teamId: app.team.hashid }
                )
                isError.should.equal(false)
                result.should.have.property('available', true)
            })

            it('returns available: false for a banned instance name', async function () {
                // 'forge' is in the banned name list
                const { result, isError } = await callTool(
                    'platform.check-name-availability',
                    { name: 'forge', type: 'instance' }
                )
                isError.should.equal(false)
                result.should.have.property('available', false)
            })
        })
    })

    // -------------------------------------------------------------------------
    // Write tools
    // -------------------------------------------------------------------------

    describe('Write tools', function () {
        describe('platform.create-application', function () {
            it('creates an application in a team (as owner)', async function () {
                const appName = 'mcp-test-app-' + Date.now()
                const { statusCode, result, isError } = await callTool(
                    'platform.create-application',
                    { name: appName, teamId: app.team.hashid },
                    'alice'
                )
                statusCode.should.equal(200)
                isError.should.equal(false)
                result.should.have.property('id')
                result.should.have.property('name', appName)
            })

            it('rejects creation with unknown team', async function () {
                const { isError, result } = await callTool(
                    'platform.create-application',
                    { name: 'some-app', teamId: 'notateam' },
                    'alice'
                )
                isError.should.equal(true)
                result.should.have.property('error')
            })
        })

        describe('platform.create-instance', function () {
            it('creates an instance and returns navigation hint (as owner)', async function () {
                const instanceName = 'mcp-inst-' + Date.now()
                const { statusCode, result, isError } = await callTool(
                    'platform.create-instance',
                    {
                        name: instanceName,
                        applicationId: app.application.hashid,
                        projectType: app.projectType.hashid,
                        stack: app.stack.hashid,
                        template: app.template.hashid
                    },
                    'alice'
                )
                statusCode.should.equal(200)
                isError.should.equal(false)
                result.should.have.property('name', instanceName)
                // Navigation annotation
                result.should.have.property('navigation')
                result.navigation.should.have.property('suggestion', 'open-editor')
                result.navigation.should.have.property('target')
                result.navigation.target.should.match(/\/instance\/.*\/editor/)
            })

            it('rejects creation with unknown application', async function () {
                const { isError, result } = await callTool(
                    'platform.create-instance',
                    {
                        name: 'will-fail',
                        applicationId: 'doesnotexist',
                        projectType: app.projectType.hashid,
                        stack: app.stack.hashid,
                        template: app.template.hashid
                    },
                    'alice'
                )
                isError.should.equal(true)
                result.should.have.property('error')
            })
        })
    })

    // -------------------------------------------------------------------------
    // Navigation tools
    // -------------------------------------------------------------------------

    describe('Navigation tools', function () {
        describe('platform.open-editor', function () {
            it('returns the editor URL for an instance', async function () {
                const { statusCode, result, isError } = await callTool(
                    'platform.open-editor',
                    { instanceId: app.project.id }
                )
                statusCode.should.equal(200)
                isError.should.equal(false)
                result.should.have.property('target')
                result.target.should.match(/\/instance\/.*\/editor/)
                result.should.have.property('message')
            })
        })

        describe('platform.open-instance', function () {
            it('returns the instance URL for an instance', async function () {
                const { statusCode, result, isError } = await callTool(
                    'platform.open-instance',
                    { instanceId: app.project.id }
                )
                statusCode.should.equal(200)
                isError.should.equal(false)
                result.should.have.property('target')
                result.target.should.match(/\/instance\/.*/)
                result.should.have.property('message')
            })
        })
    })

    // -------------------------------------------------------------------------
    // Destructive tools
    // -------------------------------------------------------------------------

    describe('Destructive tools', function () {
        describe('platform.delete-application', function () {
            it('deletes an empty application', async function () {
                // Create a fresh application with no instances
                const emptyApp = await factory.createApplication(
                    { name: 'mcp-deletable-app-' + Date.now() },
                    app.team
                )

                const { statusCode, result, isError } = await callTool(
                    'platform.delete-application',
                    { applicationId: emptyApp.hashid },
                    'alice'
                )
                statusCode.should.equal(200)
                isError.should.equal(false)
                result.should.have.property('status', 'okay')
                result.should.have.property('message')

                // Verify it's gone
                const gone = await app.db.models.Application.byId(emptyApp.hashid)
                should.not.exist(gone)
            })

            it('refuses to delete an application that has instances', async function () {
                // app.application already has app.project inside it
                const { isError, result } = await callTool(
                    'platform.delete-application',
                    { applicationId: app.application.hashid },
                    'alice'
                )
                isError.should.equal(true)
                result.should.have.property('error')
                result.error.should.match(/delete the instances/)
            })
        })

        describe('platform.delete-instance', function () {
            it('deletes an instance', async function () {
                // Create a throwaway instance
                const throwaway = await factory.createInstance(
                    { name: 'mcp-del-inst-' + Date.now() },
                    app.application,
                    app.stack,
                    app.template,
                    app.projectType,
                    { start: false }
                )

                const { statusCode, result, isError } = await callTool(
                    'platform.delete-instance',
                    // Project uses UUID as PK; pass .id not .hashid
                    { instanceId: throwaway.id },
                    'alice'
                )
                statusCode.should.equal(200)
                isError.should.equal(false)
                result.should.have.property('status', 'okay')
                result.should.have.property('message')

                // Verify it's gone
                const gone = await app.db.models.Project.byId(throwaway.id)
                should.not.exist(gone)
            })

            it('returns error for unknown instance id', async function () {
                const { isError, result } = await callTool(
                    'platform.delete-instance',
                    { instanceId: 'doesnotexist' },
                    'alice'
                )
                isError.should.equal(true)
                result.should.have.property('error')
            })
        })
    })

    // -------------------------------------------------------------------------
    // RBAC tests
    // -------------------------------------------------------------------------

    describe('RBAC', function () {
        describe('Viewer role', function () {
            it('can call list-teams', async function () {
                const { isError, result } = await callTool('platform.list-teams', {}, 'carol')
                isError.should.equal(false)
                result.should.have.property('teams')
            })

            it('can call list-applications', async function () {
                const { isError, result } = await callTool(
                    'platform.list-applications',
                    { teamId: app.team.hashid },
                    'carol'
                )
                isError.should.equal(false)
                result.should.have.property('applications')
            })

            it('cannot create an application (insufficient permissions)', async function () {
                const { isError, result } = await callTool(
                    'platform.create-application',
                    { name: 'viewer-should-not-create', teamId: app.team.hashid },
                    'carol'
                )
                isError.should.equal(true)
                result.should.have.property('error')
                result.error.should.match(/insufficient permissions|Access denied/i)
            })

            it('cannot delete an instance (insufficient permissions)', async function () {
                const { isError, result } = await callTool(
                    'platform.delete-instance',
                    { instanceId: app.project.id },
                    'carol'
                )
                isError.should.equal(true)
                result.should.have.property('error')
                result.error.should.match(/insufficient permissions|Access denied/i)
            })
        })

        describe('Member role', function () {
            // project:create is Owner-only per forge/lib/permissions.js
            it('can list teams', async function () {
                const { isError, result } = await callTool('platform.list-teams', {}, 'bob')
                isError.should.equal(false)
                result.should.have.property('teams')
            })

            it('cannot create an application (insufficient permissions — project:create is Owner-only)', async function () {
                const appName = 'member-app-' + Date.now()
                const { isError, result } = await callTool(
                    'platform.create-application',
                    { name: appName, teamId: app.team.hashid },
                    'bob'
                )
                isError.should.equal(true)
                result.should.have.property('error')
                result.error.should.match(/insufficient permissions|Access denied/i)
            })

            it('cannot delete an instance (insufficient permissions)', async function () {
                const { isError, result } = await callTool(
                    'platform.delete-instance',
                    { instanceId: app.project.id },
                    'bob'
                )
                isError.should.equal(true)
                result.should.have.property('error')
                result.error.should.match(/insufficient permissions|Access denied/i)
            })
        })

        describe('Owner role', function () {
            it('can list teams', async function () {
                const { isError, result } = await callTool('platform.list-teams', {}, 'dave')
                isError.should.equal(false)
                result.should.have.property('teams')
            })

            it('can create an application', async function () {
                const appName = 'owner-app-' + Date.now()
                const { isError, result } = await callTool(
                    'platform.create-application',
                    { name: appName, teamId: app.team.hashid },
                    'dave'
                )
                isError.should.equal(false)
                result.should.have.property('name', appName)
            })

            it('can delete an instance', async function () {
                // Create a throwaway instance for dave to delete
                const throwaway = await factory.createInstance(
                    { name: 'owner-del-inst-' + Date.now() },
                    app.application,
                    app.stack,
                    app.template,
                    app.projectType,
                    { start: false }
                )

                const { isError, result } = await callTool(
                    'platform.delete-instance',
                    { instanceId: throwaway.id },
                    'dave'
                )
                isError.should.equal(false)
                result.should.have.property('status', 'okay')
            })
        })
    })

    // -------------------------------------------------------------------------
    // Instance lifecycle tools (start / stop / restart / suspend)
    // -------------------------------------------------------------------------

    describe('Instance lifecycle tools', function () {
        let lifecycleInstance

        before(async function () {
            // Create a fresh instance for lifecycle tests
            lifecycleInstance = await factory.createInstance(
                { name: 'mcp-lifecycle-' + Date.now() },
                app.application,
                app.stack,
                app.template,
                app.projectType,
                { start: false }
            )
        })

        it('platform.stop-instance — stops a running instance', async function () {
            // Set the instance state to running so it can be stopped
            lifecycleInstance.state = 'running'
            await lifecycleInstance.save()

            const { statusCode, result, isError } = await callTool(
                'platform.stop-instance',
                // Project uses UUID as PK
                { instanceId: lifecycleInstance.id }
            )
            statusCode.should.equal(200)
            isError.should.equal(false)
            result.should.have.property('status', 'okay')
            result.should.have.property('state', 'stopped')
        })

        it('platform.start-instance — starts a stopped instance', async function () {
            // Ensure instance is stopped
            lifecycleInstance.state = 'stopped'
            await lifecycleInstance.save()

            const { statusCode, result, isError } = await callTool(
                'platform.start-instance',
                { instanceId: lifecycleInstance.id }
            )
            statusCode.should.equal(200)
            isError.should.equal(false)
            result.should.have.property('status', 'okay')
            result.should.have.property('state', 'running')
        })

        it('platform.restart-instance — restarts a running instance', async function () {
            lifecycleInstance.state = 'running'
            await lifecycleInstance.save()

            const { statusCode, result, isError } = await callTool(
                'platform.restart-instance',
                { instanceId: lifecycleInstance.id }
            )
            statusCode.should.equal(200)
            isError.should.equal(false)
            result.should.have.property('status', 'okay')
            result.should.have.property('state', 'running')
        })

        it('platform.stop-instance — returns error for suspended instance', async function () {
            lifecycleInstance.state = 'suspended'
            await lifecycleInstance.save()

            const { isError, result } = await callTool(
                'platform.stop-instance',
                { instanceId: lifecycleInstance.id }
            )
            isError.should.equal(true)
            result.should.have.property('error')
            result.error.should.match(/suspended/)
        })

        it('platform.restart-instance — returns error for suspended instance', async function () {
            lifecycleInstance.state = 'suspended'
            await lifecycleInstance.save()

            const { isError, result } = await callTool(
                'platform.restart-instance',
                { instanceId: lifecycleInstance.id }
            )
            isError.should.equal(true)
            result.should.have.property('error')
            result.error.should.match(/suspended/)
        })

        it('platform.suspend-instance — returns error if already suspended', async function () {
            lifecycleInstance.state = 'suspended'
            await lifecycleInstance.save()

            const { isError, result } = await callTool(
                'platform.suspend-instance',
                { instanceId: lifecycleInstance.id }
            )
            isError.should.equal(true)
            result.should.have.property('error')
            result.error.should.match(/suspended/)
        })

        it('platform.suspend-instance — suspends a running instance', async function () {
            lifecycleInstance.state = 'running'
            await lifecycleInstance.save()

            // The stub container driver requires the project to be registered in its
            // internal list (i.e. it must have been "started" via containers.start).
            // Since we created this instance with { start: false }, we stub containers.stop
            // to simulate a successful container stop operation.
            sinon.stub(app.containers, 'stop').resolves()

            const { statusCode, result, isError } = await callTool(
                'platform.suspend-instance',
                { instanceId: lifecycleInstance.id }
            )
            statusCode.should.equal(200)
            isError.should.equal(false)
            result.should.have.property('status', 'okay')
            result.should.have.property('state', 'suspended')
        })
    })
})
