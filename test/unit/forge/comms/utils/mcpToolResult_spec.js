const should = require('should')

const { parseMcpToolResult } = require('../../../../../forge/comms/utils/mcpToolResult')

describe('parseMcpToolResult', function () {
    it('parses JSON carried as text in the first content block', function () {
        const payload = { tools: [{ name: 'a' }], hash: 'h1' }
        const parsed = parseMcpToolResult({ result: { content: [{ type: 'text', text: JSON.stringify(payload) }] } })
        parsed.should.deepEqual(payload)
    })
    it('falls back to structuredContent when there is no text block', function () {
        const structuredContent = { tools: [], hash: null }
        parseMcpToolResult({ result: { structuredContent } }).should.deepEqual(structuredContent)
    })
    it('returns null when the text is not valid JSON', function () {
        should(parseMcpToolResult({ result: { content: [{ type: 'text', text: 'not json' }] } })).be.null()
    })
    it('returns null when there is no result', function () {
        should(parseMcpToolResult({})).be.null()
        should(parseMcpToolResult(undefined)).be.null()
    })
})
