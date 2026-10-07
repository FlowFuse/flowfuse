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

        it('refuses a teamId that would reach another route', async function () {
            for (const teamId of ['../teams/team2', 'team1/../team2', 'team1?x=1']) {
                const response = await tool.handler({ teamId, path: 'a' }, { inject })
                response.statusCode.should.equal(400)
                response.json().should.have.property('code', 'invalid_request')
            }
            inject.called.should.be.false()
        })

        it('explains the route\'s bare 404, which is also what a disabled library or a non-member gets', async function () {
            inject.resolves({ statusCode: 404, json: () => ({ code: 'not_found', error: 'Not Found' }) })
            const response = await tool.handler({ teamId: 'team1', path: 'missing' }, { inject })
            response.statusCode.should.equal(404)
            const body = response.json()
            body.should.have.property('code', 'not_found')
            body.error.should.match(/Nothing was deleted/)
            body.error.should.match(/shared library is not enabled/)
        })

        it('passes through a rejection for a token without write access', async function () {
            const errorResponse = { statusCode: 403, json: () => ({ code: 'unauthorized', error: 'unauthorized' }) }
            inject.resolves(errorResponse)
            const response = await tool.handler({ teamId: 'team1', path: 'a' }, { inject })
            response.should.equal(errorResponse)
        })
    })
})
