const should = require('should') // eslint-disable-line

const { diffSchemas } = require('../../../../../forge/lib/schemas/diff')

describe('Schema diff', function () {
    it('finds no changes between equal documents', function () {
        diffSchemas({ type: 'object', required: ['a'] }, { required: ['a'], type: 'object' }).should.eql([])
    })

    it('ignores the top level $id', function () {
        diffSchemas({ $id: 'urn:flowfuse:schema:a:1.0.0', type: 'string' }, { $id: 'urn:flowfuse:schema:a:2.0.0', type: 'string' }).should.eql([])
    })

    it('lists added, deleted and changed keywords and properties by path', function () {
        const from = {
            type: 'object',
            properties: {
                value: { type: 'number', unit: 'Cel' },
                sensor: { type: 'string' }
            }
        }
        const to = {
            type: 'object',
            properties: {
                value: { type: 'number', unit: 'K', minimum: 0 },
                readAt: { type: 'string', format: 'date-time' }
            }
        }
        diffSchemas(from, to).should.eql([
            { path: '/properties/readAt', type: 'added', detail: { to: { type: 'string', format: 'date-time' } } },
            { path: '/properties/sensor', type: 'deleted', detail: { from: { type: 'string' } } },
            { path: '/properties/value/minimum', type: 'added', detail: { to: 0 } },
            { path: '/properties/value/unit', type: 'changed', detail: { from: 'Cel', to: 'K' } }
        ])
    })

    it('compares arrays whole', function () {
        diffSchemas({ required: ['a'] }, { required: ['a', 'b'] }).should.eql([
            { path: '/required', type: 'changed', detail: { from: ['a'], to: ['a', 'b'] } }
        ])
        diffSchemas({ enum: [1, { a: 1 }] }, { enum: [1, { a: 1 }] }).should.eql([])
    })

    it('reports a change of kind as a change', function () {
        diffSchemas({ items: { type: 'string' } }, { items: false }).should.eql([
            { path: '/items', type: 'changed', detail: { from: { type: 'string' }, to: false } }
        ])
    })

    it('escapes property names in paths', function () {
        diffSchemas({ properties: {} }, { properties: { 'a/b~c': { type: 'string' } } })[0].path.should.equal('/properties/a~1b~0c')
    })

    it('compares documents that are not objects', function () {
        diffSchemas(true, { type: 'string' }).should.eql([{ path: '', type: 'changed', detail: { from: true, to: { type: 'string' } } }])
    })
})
