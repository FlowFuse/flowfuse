const should = require('should') // eslint-disable-line no-unused-vars
const sinon = require('sinon')

const tools = require('../../../../../../../forge/ee/lib/mcp/tools/snapshots')

function getTool (name) {
    return tools.find(tool => tool.name === name)
}

describe('MCP Snapshots Tools', function () {
    let inject

    beforeEach(function () {
        inject = sinon.stub()
    })

    describe('platform_get_snapshot', function () {
        const tool = getTool('platform_get_snapshot')

        it('calls the metadata endpoint by default', async function () {
            inject.resolves({ statusCode: 200, json: () => ({ id: 'snap1' }) })
            await tool.handler({ snapshotId: 'snap1' }, { inject })
            inject.calledOnce.should.be.true()
            inject.firstCall.args[0].should.eql({ method: 'GET', url: '/api/v1/snapshots/snap1' })
        })

        it('returns the metadata response untouched', async function () {
            const metaResponse = { statusCode: 200, json: () => ({ id: 'snap1', name: 'one' }) }
            inject.resolves(metaResponse)
            const response = await tool.handler({ snapshotId: 'snap1' }, { inject })
            response.should.equal(metaResponse)
        })

        it('calls the full endpoint when includeFlows is set', async function () {
            inject.resolves({ statusCode: 200, json: () => ({ id: 'snap1', flows: { flows: [] } }) })
            await tool.handler({ snapshotId: 'snap1', includeFlows: true }, { inject })
            inject.calledOnce.should.be.true()
            inject.firstCall.args[0].should.eql({ method: 'GET', url: '/api/v1/snapshots/snap1/full' })
        })

        it('returns the flows and redacts env values while keeping the keys', async function () {
            inject.resolves({
                statusCode: 200,
                json: () => ({
                    id: 'snap1',
                    flows: { flows: [{ id: 'a', type: 'inject' }] },
                    settings: {
                        modules: { 'node-red-dashboard': '3.0.0' },
                        env: { API_KEY: 'super-secret', REGION: 'eu-west-1' }
                    }
                })
            })
            const response = await tool.handler({ snapshotId: 'snap1', includeFlows: true }, { inject })
            const body = response.json()
            response.statusCode.should.equal(200)
            body.flows.should.eql({ flows: [{ id: 'a', type: 'inject' }] })
            body.settings.modules.should.eql({ 'node-red-dashboard': '3.0.0' })
            body.settings.env.should.eql({ API_KEY: '[REDACTED]', REGION: '[REDACTED]' })
        })

        it('redacts the nested value of object-shaped env vars', async function () {
            inject.resolves({
                statusCode: 200,
                json: () => ({ id: 'snap1', settings: { env: { API_KEY: { hidden: true, value: 'super-secret' } } } })
            })
            const response = await tool.handler({ snapshotId: 'snap1', includeFlows: true }, { inject })
            response.json().settings.env.should.eql({ API_KEY: { hidden: true, value: '[REDACTED]' } })
        })

        it('passes through error responses unmodified', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found', error: 'Not Found' }) }
            inject.resolves(errorResponse)
            const response = await tool.handler({ snapshotId: 'nope', includeFlows: true }, { inject })
            response.should.equal(errorResponse)
        })
    })

    describe('platform_diff_snapshots', function () {
        const tool = getTool('platform_diff_snapshots')

        function fullSnapshot (id, name, flows) {
            return { statusCode: 200, json: () => ({ id, name, flows: { flows } }) }
        }

        it('fetches both snapshots from the full endpoint', async function () {
            inject.onFirstCall().resolves(fullSnapshot('snap1', 'one', []))
            inject.onSecondCall().resolves(fullSnapshot('snap2', 'two', []))
            await tool.handler({ fromSnapshotId: 'snap1', toSnapshotId: 'snap2' }, { inject })
            inject.calledTwice.should.be.true()
            inject.firstCall.args[0].should.eql({ method: 'GET', url: '/api/v1/snapshots/snap1/full' })
            inject.secondCall.args[0].should.eql({ method: 'GET', url: '/api/v1/snapshots/snap2/full' })
        })

        it('reports the changes between the two snapshots with a summary', async function () {
            inject.onFirstCall().resolves(fullSnapshot('snap1', 'one', [
                { id: 'a', type: 'inject', topic: 'before' },
                { id: 'b', type: 'debug' }
            ]))
            inject.onSecondCall().resolves(fullSnapshot('snap2', 'two', [
                { id: 'a', type: 'inject', topic: 'after' },
                { id: 'c', type: 'function' }
            ]))
            const response = await tool.handler({ fromSnapshotId: 'snap1', toSnapshotId: 'snap2' }, { inject })
            const body = response.json()
            response.statusCode.should.equal(200)
            body.from.should.eql({ id: 'snap1', name: 'one' })
            body.to.should.eql({ id: 'snap2', name: 'two' })
            body.summary.should.eql({ added: 1, deleted: 1, changed: 1 })
            body.changes.should.containEql({ item: 'b', diffType: 'deleted' })
            body.changes.should.containEql({ item: 'c', diffType: 'added' })
            body.changes.should.containEql({ item: 'a', diffType: 'changed', prop: 'topic', value1: 'before', value2: 'after' })
        })

        it('ignores position changes by default and reports them when asked', async function () {
            const from = [{ id: 'a', type: 'inject', x: 10, y: 10 }]
            const to = [{ id: 'a', type: 'inject', x: 90, y: 10 }]

            inject.onFirstCall().resolves(fullSnapshot('snap1', 'one', from))
            inject.onSecondCall().resolves(fullSnapshot('snap2', 'two', to))
            const ignored = await tool.handler({ fromSnapshotId: 'snap1', toSnapshotId: 'snap2' }, { inject })
            ignored.json().changes.should.eql([])

            inject.resetHistory()
            inject.onFirstCall().resolves(fullSnapshot('snap1', 'one', from))
            inject.onSecondCall().resolves(fullSnapshot('snap2', 'two', to))
            const included = await tool.handler({ fromSnapshotId: 'snap1', toSnapshotId: 'snap2', includePosition: true }, { inject })
            included.json().changes.should.eql([{ item: 'a', diffType: 'changed', prop: 'x', value1: 10, value2: 90 }])
        })

        it('does not diff settings or env', async function () {
            inject.onFirstCall().resolves({ statusCode: 200, json: () => ({ id: 'snap1', flows: { flows: [] }, settings: { env: { API_KEY: 'one' } } }) })
            inject.onSecondCall().resolves({ statusCode: 200, json: () => ({ id: 'snap2', flows: { flows: [] }, settings: { env: { API_KEY: 'two' } } }) })
            const response = await tool.handler({ fromSnapshotId: 'snap1', toSnapshotId: 'snap2' }, { inject })
            const body = response.json()
            body.changes.should.eql([])
            JSON.stringify(body).should.not.containEql('API_KEY')
        })

        it('passes through an error response from either snapshot fetch', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found', error: 'Not Found' }) }

            inject.onFirstCall().resolves(errorResponse)
            inject.onSecondCall().resolves(fullSnapshot('snap2', 'two', []))
            const fromError = await tool.handler({ fromSnapshotId: 'nope', toSnapshotId: 'snap2' }, { inject })
            fromError.should.equal(errorResponse)

            inject.resetHistory()
            inject.onFirstCall().resolves(fullSnapshot('snap1', 'one', []))
            inject.onSecondCall().resolves(errorResponse)
            const toError = await tool.handler({ fromSnapshotId: 'snap1', toSnapshotId: 'nope' }, { inject })
            toError.should.equal(errorResponse)
        })

        it('returns an error naming the snapshots that have no flows', async function () {
            inject.onFirstCall().resolves({ statusCode: 200, json: () => ({ id: 'snap1', name: 'one' }) })
            inject.onSecondCall().resolves(fullSnapshot('snap2', 'two', []))
            const response = await tool.handler({ fromSnapshotId: 'snap1', toSnapshotId: 'snap2' }, { inject })
            response.isError.should.be.true()
            response.code.should.equal(400)
            response.content.code.should.equal('invalid_request')
            response.content.error.should.containEql('snap1')
            response.content.error.should.not.containEql('snap2')
        })
    })
})
