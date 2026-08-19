const should = require('should') // eslint-disable-line no-unused-vars

const { diffFlows } = require('../../../../../../forge/ee/lib/mcp/snapshotDiff')

describe('MCP Snapshot Diff', function () {
    it('reports nodes only in the newer flows as added', async function () {
        const { changes, summary } = diffFlows(
            [{ id: 'a', type: 'inject' }],
            [{ id: 'a', type: 'inject' }, { id: 'b', type: 'debug' }]
        )
        changes.should.eql([{ item: 'b', diffType: 'added' }])
        summary.should.eql({ added: 1, deleted: 0, changed: 0 })
    })

    it('reports nodes only in the older flows as deleted', async function () {
        const { changes, summary } = diffFlows(
            [{ id: 'a', type: 'inject' }, { id: 'b', type: 'debug' }],
            [{ id: 'a', type: 'inject' }]
        )
        changes.should.eql([{ item: 'b', diffType: 'deleted' }])
        summary.should.eql({ added: 0, deleted: 1, changed: 0 })
    })

    it('reports one changed entry per differing property, with both values', async function () {
        const { changes, summary } = diffFlows(
            [{ id: 'a', type: 'function', name: 'old', func: 'return msg;' }],
            [{ id: 'a', type: 'function', name: 'new', func: 'return null;' }]
        )
        summary.should.eql({ added: 0, deleted: 0, changed: 2 })
        changes.should.containEql({ item: 'a', diffType: 'changed', prop: 'name', value1: 'old', value2: 'new' })
        changes.should.containEql({ item: 'a', diffType: 'changed', prop: 'func', value1: 'return msg;', value2: 'return null;' })
    })

    it('compares properties deeply rather than by reference', async function () {
        const { changes } = diffFlows(
            [{ id: 'a', type: 'inject', wires: [['b']] }],
            [{ id: 'a', type: 'inject', wires: [['b']] }]
        )
        changes.should.eql([])
    })

    it('reports a property added on only one side as changed', async function () {
        const { changes } = diffFlows(
            [{ id: 'a', type: 'inject' }],
            [{ id: 'a', type: 'inject', topic: 'test' }]
        )
        changes.should.eql([{ item: 'a', diffType: 'changed', prop: 'topic', value1: undefined, value2: 'test' }])
    })

    it('ignores the render-time properties id, w and h', async function () {
        const { changes, summary } = diffFlows(
            [{ id: 'a', type: 'group', w: 100, h: 50 }],
            [{ id: 'a', type: 'group', w: 400, h: 200 }]
        )
        changes.should.eql([])
        summary.should.eql({ added: 0, deleted: 0, changed: 0 })
    })

    it('ignores node position changes by default', async function () {
        const { changes, summary } = diffFlows(
            [{ id: 'a', type: 'inject', x: 100, y: 100 }],
            [{ id: 'a', type: 'inject', x: 500, y: 300 }]
        )
        changes.should.eql([])
        summary.should.eql({ added: 0, deleted: 0, changed: 0 })
    })

    it('reports node position changes when includePosition is set', async function () {
        const { changes, summary } = diffFlows(
            [{ id: 'a', type: 'inject', x: 100, y: 100 }],
            [{ id: 'a', type: 'inject', x: 500, y: 100 }],
            { includePosition: true }
        )
        changes.should.eql([{ item: 'a', diffType: 'changed', prop: 'x', value1: 100, value2: 500 }])
        summary.should.eql({ added: 0, deleted: 0, changed: 1 })
    })

    it('skips nodes without an id', async function () {
        const { changes, summary } = diffFlows(
            [{ type: 'inject' }],
            [{ type: 'debug' }]
        )
        changes.should.eql([])
        summary.should.eql({ added: 0, deleted: 0, changed: 0 })
    })

    it('treats missing flow arrays as empty', async function () {
        diffFlows(undefined, undefined).changes.should.eql([])
        diffFlows(null, [{ id: 'a', type: 'inject' }]).changes.should.eql([{ item: 'a', diffType: 'added' }])
    })
})
