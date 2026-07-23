const should = require('should')

const EXPERT_MCP_PLATFORM_SCOPE = 'ff-expert:platform'
const EXPERT_MCP_PLATFORM_OWNER_TYPE = 'user:expert-mcp'

// Mints the nameless user:expert-mcp token the first-party Expert uses in
// production (forge/ee/lib/expert/index.js). It must be nameless: a named token
// has request.session.scope deleted (the #7446 temp hack), which would skip the
// IMPLICIT_TOKEN_SCOPES['user:expert-mcp'] allow-list check we want to exercise.
// Binds a finder to a tool module's exported array; findTool(name) returns the
// named tool and asserts it exists.
function toolFinder (tools) {
    return (name) => {
        const tool = tools.find(t => t.name === name)
        should.exist(tool)
        return tool
    }
}

// A stub inject that records every call and hands back a canned response, so a
// handler's request wiring can be asserted without a running app.
function recordingInject (response = { statusCode: 200, json: () => ({}) }) {
    const calls = []
    const inject = async (options) => {
        calls.push(options)
        return response
    }
    return { calls, inject }
}

async function createExpertMcpToken (app, user = app.user) {
    const { token } = await app.db.controllers.AccessToken.createTokenForUser(
        user,
        null,
        [EXPERT_MCP_PLATFORM_SCOPE],
        undefined,
        EXPERT_MCP_PLATFORM_OWNER_TYPE
    )
    return token
}

// Asserts an MCP tool returns the same result as calling its backing route
// directly. The tool builds its own {method, url}; the test states the route it
// should hit. A wrong url/method/path-param diverges and fails. The response
// shape is never hard-coded, so route changes need no update here.
//   transform:  reshape the route response for tools that intentionally do so
//               (credential redaction, redirect-to-url rewrites)
//   raw:        compare bodies as strings for non-JSON routes (e.g. CSV)
//   normalize:  reduce both bodies to their stable parts before comparing, for
//               routes returning randomised/point-in-time data
async function expectToolMatchesRoute (inject, tool, args, { method, url, payload, transform, raw, normalize } = {}) {
    const viaTool = await tool.handler(args, { inject })
    const routeResponse = await inject({ method, url, payload })
    const expected = transform
        ? transform(routeResponse)
        : { statusCode: routeResponse.statusCode, body: raw ? routeResponse.body : routeResponse.json() }
    viaTool.statusCode.should.equal(expected.statusCode)
    let actualBody = raw ? viaTool.body : viaTool.json()
    let expectedBody = expected.body
    if (normalize) {
        actualBody = normalize(actualBody)
        expectedBody = normalize(expectedBody)
    }
    should(actualBody).eql(expectedBody)
    return { viaTool, routeResponse }
}

module.exports = { expectToolMatchesRoute, createExpertMcpToken, toolFinder, recordingInject }
