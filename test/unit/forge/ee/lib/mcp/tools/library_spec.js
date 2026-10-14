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

        it('passes error responses through unchanged', async function () {
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

    describe('platform_delete_library_entry', function () {
        const tool = getTool('platform_delete_library_entry')

        it('is annotated as destructive so it is served as a delete tool', function () {
            tool.annotations.should.have.property('readOnlyHint', false)
            tool.annotations.should.have.property('destructiveHint', true)
        })

        it('deletes the entry at the path and returns the route reply', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ status: 'okay', deleteCount: 1 }) }
            inject.resolves(routeResponse)
            const response = await tool.handler({ teamId: 'team1', path: 'utilities/formatDate' }, { inject })
            inject.calledOnce.should.be.true()
            inject.firstCall.args[0].should.eql({ method: 'DELETE', url: '/storage/library/team1/utilities/formatDate' })
            response.should.equal(routeResponse)
        })

        it('sends the type as a query parameter when one is given', async function () {
            inject.resolves({ statusCode: 200, json: () => ({ status: 'okay', deleteCount: 1 }) })
            await tool.handler({ teamId: 'team1', path: 'formatDate', type: 'functions' }, { inject })
            inject.firstCall.args[0].url.should.equal('/storage/library/team1/formatDate?type=functions')
        })

        it('encodes each path segment but keeps the folder separators', async function () {
            inject.resolves({ statusCode: 200, json: () => ({ status: 'okay', deleteCount: 1 }) })
            await tool.handler({ teamId: 'team1', path: 'my folder/100%/a?b#c' }, { inject })
            inject.firstCall.args[0].url.should.equal('/storage/library/team1/my%20folder/100%25/a%3Fb%23c')
        })

        it('refuses a path that is empty or would address the whole library or another route', async function () {
            for (const path of ['/', '//', '/a', 'a/', 'a//b', '..', 'a/../b', './a']) {
                const response = await tool.handler({ teamId: 'team1', path }, { inject })
                response.statusCode.should.equal(400)
                response.json().should.have.property('code', 'invalid_request')
            }
            z.object(tool.inputSchema).shape.path.safeParse('').success.should.be.false()
            inject.called.should.be.false()
        })

        it('passes through a rejection for a token without write access', async function () {
            const errorResponse = { statusCode: 403, json: () => ({ code: 'unauthorized', error: 'unauthorized' }) }
            inject.resolves(errorResponse)
            const response = await tool.handler({ teamId: 'team1', path: 'a' }, { inject })
            response.should.equal(errorResponse)
        })
    })
})
