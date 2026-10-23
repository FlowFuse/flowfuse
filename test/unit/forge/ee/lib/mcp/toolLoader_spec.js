const should = require('should') // eslint-disable-line no-unused-vars

const { formatResponse } = require('../../../../../../forge/ee/lib/mcp/toolLoader')

describe('MCP toolLoader', function () {
    describe('formatResponse', function () {
        it('turns an empty success body into { status: "okay" }', function () {
            formatResponse({ statusCode: 201, body: '', json: () => JSON.parse('') }).should.eql({ status: 'okay' })
        })

        it('returns the parsed body of a success with a body', function () {
            formatResponse({ statusCode: 200, body: '{"id":"a"}', json: () => ({ id: 'a' }) }).should.eql({ id: 'a' })
        })

        it('returns the result of a tool that builds its own response without a body', function () {
            formatResponse({ statusCode: 200, json: () => ({ databases: [] }) }).should.eql({ databases: [] })
        })

        it('wraps an error response as an error result', function () {
            formatResponse({ statusCode: 404, body: '{"code":"not_found"}', json: () => ({ code: 'not_found' }) })
                .should.eql({ content: { code: 'not_found' }, code: 404, isError: true })
        })
    })
})
