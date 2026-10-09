const should = require('should') // eslint-disable-line no-unused-vars
const sinon = require('sinon')
const { z } = require('zod')

const tools = require('../../../../../../../forge/ee/lib/mcp/tools/library')

function getTool (name) {
    return tools.find(tool => tool.name === name)
}

describe('MCP Library Tools', function () {
    let inject

    beforeEach(function () {
        inject = sinon.stub()
    })

    describe('platform_create_library_entry', function () {
        const tool = getTool('platform_create_library_entry')
        const created = () => ({ statusCode: 201, json: () => JSON.parse('') })

        it('is a non-destructive, idempotent write', function () {
            tool.annotations.should.containEql({ readOnlyHint: false, destructiveHint: false, idempotentHint: true })
        })

        it('posts type, body and meta to the library path and returns the entry', async function () {
            inject.resolves(created())
            const meta = { description: 'retry helper' }
            const response = await tool.handler({ teamId: 'team1', path: 'utils/retry', type: 'functions', body: 'return msg', meta }, { inject })
            inject.calledOnce.should.be.true()
            inject.firstCall.args[0].should.eql({
                method: 'POST',
                url: '/storage/library/team1/utils/retry',
                payload: { type: 'functions', body: 'return msg', meta }
            })
            response.statusCode.should.equal(201)
            response.json().should.eql({ entry: { path: 'utils/retry', type: 'functions' } })
        })

        it('omits meta when none is given', async function () {
            inject.resolves(created())
            await tool.handler({ teamId: 'team1', path: 'a', type: 'functions', body: 'x' }, { inject })
            inject.firstCall.args[0].payload.should.eql({ type: 'functions', body: 'x' })
        })

        it('passes an object body through for the route to store as JSON text', async function () {
            inject.resolves(created())
            const body = [{ id: 'n1', type: 'tab' }]
            await tool.handler({ teamId: 'team1', path: 'flow', type: 'flows', body }, { inject })
            inject.firstCall.args[0].payload.body.should.eql(body)
        })

        it('encodes each path segment but keeps the folder separators', async function () {
            inject.resolves(created())
            await tool.handler({ teamId: 'team1', path: 'my dir/a#b?c/p%q', type: 'functions', body: 'x' }, { inject })
            inject.firstCall.args[0].url.should.equal('/storage/library/team1/my%20dir/a%23b%3Fc/p%25q')
        })

        const invalidPaths = ['/a', 'a/', 'a//b', 'a/./b', 'a/../b', '..', '.']
        invalidPaths.forEach(path => {
            it(`rejects the path '${path}' without calling the route`, async function () {
                const response = await tool.handler({ teamId: 'team1', path, type: 'functions', body: 'x' }, { inject })
                inject.called.should.be.false()
                response.statusCode.should.equal(400)
                response.json().code.should.equal('invalid_request')
            })
        })

        it('rejects a flows body that is not valid JSON, which would break reading the entry back', async function () {
            const response = await tool.handler({ teamId: 'team1', path: 'a', type: 'flows', body: 'not json' }, { inject })
            inject.called.should.be.false()
            response.statusCode.should.equal(400)
            response.json().error.should.match(/valid JSON/)
        })

        it('accepts a flows body that is a JSON string', async function () {
            inject.resolves(created())
            await tool.handler({ teamId: 'team1', path: 'a', type: 'flows', body: '[{"id":"n1"}]' }, { inject })
            inject.calledOnce.should.be.true()
        })

        it('does not require a function body to be JSON', async function () {
            inject.resolves(created())
            await tool.handler({ teamId: 'team1', path: 'a', type: 'functions', body: 'not json' }, { inject })
            inject.calledOnce.should.be.true()
        })

        it('explains a 404 as the feature, team or membership being unavailable', async function () {
            inject.resolves({ statusCode: 404, json: () => ({ code: 'not_found', error: 'Not Found' }) })
            const response = await tool.handler({ teamId: 'team1', path: 'a', type: 'functions', body: 'x' }, { inject })
            response.statusCode.should.equal(404)
            response.json().error.should.match(/shared library is not enabled/)
        })

        it('passes through other error responses unchanged', async function () {
            const errorResponse = { statusCode: 400, json: () => ({ code: 'invalid_name', error: 'Invalid entry name' }) }
            inject.resolves(errorResponse)
            const response = await tool.handler({ teamId: 'team1', path: 'a/b', type: 'functions', body: 'x' }, { inject })
            response.should.equal(errorResponse)
        })

        it('requires a non-empty path and type, and accepts string, array and object bodies', function () {
            const schema = z.object(tool.inputSchema)
            const valid = { teamId: 'team1', path: 'a', type: 'functions', body: 'x' }
            schema.safeParse(valid).success.should.be.true()
            schema.safeParse({ ...valid, body: [] }).success.should.be.true()
            schema.safeParse({ ...valid, body: { a: 1 } }).success.should.be.true()
            schema.safeParse({ ...valid, body: 5 }).success.should.be.false()
            schema.safeParse({ ...valid, path: '' }).success.should.be.false()
            schema.safeParse({ ...valid, type: '' }).success.should.be.false()
        })
    })
})
