const should = require('should')

// Asserts that an MCP tool produces the same result as calling its backing
// route directly. The tool handler builds its own {method, url} from the args;
// the test independently states the route it is expected to hit. Both are made
// with the same PAT-bearing inject, so:
//   - a wrong url/method/path-param in the tool hits a different route and the
//     status/body diverge -> the test fails (this is what proves correctness),
//   - the endpoint's response shape is never written down here, it is whatever
//     the live route returns, so a later change to the route's response needs no
//     change in the MCP test - only the route argument (the "tool mapping") is
//     ever maintained here.
//
// Every phase-1 tool is read-only, so calling the route twice (once inside the
// handler, once directly) is safe and side-effect free.
//
// For the few tools that intentionally reshape the route response (credential
// redaction, redirect-to-url rewrites), pass `transform(routeResponse)` which
// returns the { statusCode, body } the tool is expected to produce from that
// same live route response - still drift-proof, since it references the live
// response rather than a hard-coded shape.
async function expectToolMatchesRoute (inject, tool, args, { method, url, payload, transform } = {}) {
    const viaTool = await tool.handler(args, { inject })
    const routeResponse = await inject({ method, url, payload })
    const expected = transform
        ? transform(routeResponse)
        : { statusCode: routeResponse.statusCode, body: routeResponse.json() }
    viaTool.statusCode.should.equal(expected.statusCode)
    should(viaTool.json()).eql(expected.body)
    return { viaTool, routeResponse }
}

module.exports = { expectToolMatchesRoute }
