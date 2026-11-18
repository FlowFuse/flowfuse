const should = require('should')

const {
    SCHEMA_DIALECT,
    MAX_DOCUMENT_BYTES,
    MAX_DOCUMENT_DEPTH,
    MAX_PAYLOAD_BYTES,
    SchemaDocumentError,
    checkDocument,
    removeId,
    setId,
    validatePayload
} = require('../../../../../../forge/ee/lib/schemas/document')

const temperature = {
    $schema: SCHEMA_DIALECT,
    type: 'object',
    properties: {
        value: { type: 'number', unit: 'celsius' },
        sensor: { type: 'string', pattern: '^[a-z]+-[0-9]+$' },
        readAt: { type: 'string', format: 'date-time' }
    },
    required: ['value', 'sensor']
}

function nested (depth) {
    let doc = { type: 'string' }
    for (let i = 1; i < depth; i++) {
        doc = { type: 'object', properties: { child: doc } }
    }
    return doc
}

function rejectedWith (fn, code, path) {
    let error
    try {
        fn()
    } catch (err) {
        error = err
    }
    should.exist(error, 'expected an error')
    error.should.be.instanceOf(SchemaDocumentError)
    error.code.should.equal(code)
    if (path !== undefined) {
        error.path.should.equal(path)
    }
}

describe('Schema document checks', function () {
    describe('checkDocument', function () {
        it('accepts a valid 2020-12 schema', function () {
            checkDocument(temperature).problems.should.eql([])
            checkDocument({}).problems.should.eql([])
        })

        it('accepts a document without $schema', function () {
            const { $schema, ...doc } = temperature
            checkDocument(doc).problems.should.eql([])
        })

        it('reports a document that is not an object', function () {
            checkDocument([]).problems.should.eql([{ path: '', message: 'The schema must be a JSON object' }])
            checkDocument('string').problems.should.have.length(1)
            checkDocument(true).problems.should.have.length(1)
        })

        it('reports a $schema other than 2020-12', function () {
            const { problems } = checkDocument({ ...temperature, $schema: 'http://json-schema.org/draft-07/schema#' })
            problems.should.have.length(1)
            problems[0].path.should.equal('/$schema')
        })

        it('reports a document that is not valid JSON Schema, with its path', function () {
            const { problems } = checkDocument({ type: 'object', properties: { value: { type: 'numbr' } } })
            problems.length.should.be.above(0)
            problems[0].path.should.equal('/properties/value/type')
        })

        it('reports an unknown keyword', function () {
            const { problems } = checkDocument({ type: 'string', minLenght: 2 })
            problems.should.have.length(1)
            problems[0].message.should.match(/minLenght/)
        })

        it('reports an unknown format', function () {
            checkDocument({ type: 'string', format: 'not-a-format' }).problems.should.have.length(1)
        })

        it('accepts the unit annotation only as a string', function () {
            checkDocument({ type: 'number', unit: 'kPa' }).problems.should.eql([])
            checkDocument({ type: 'number', unit: 5 }).problems.should.have.length(1)
        })

        it('rejects $ref, $dynamicRef and $defs wherever a subschema is', function () {
            rejectedWith(() => checkDocument({ $ref: '#/properties/a' }), 'references_not_supported', '/$ref')
            rejectedWith(() => checkDocument({ $defs: { a: { type: 'string' } } }), 'references_not_supported', '/$defs')
            rejectedWith(() => checkDocument({ properties: { a: { $ref: 'other' } } }), 'references_not_supported', '/properties/a/$ref')
            rejectedWith(() => checkDocument({ anyOf: [{ type: 'string' }, { $dynamicRef: '#x' }] }), 'references_not_supported', '/anyOf/1/$dynamicRef')
            rejectedWith(() => checkDocument({ items: { $ref: 'other' } }), 'references_not_supported', '/items/$ref')
        })

        it('does not treat data or property names as references', function () {
            checkDocument({ type: 'object', properties: { $ref: { type: 'string' } } }).problems.should.eql([])
            checkDocument({ type: 'object', default: { $ref: 'x' } }).problems.should.eql([])
            checkDocument({ const: { $defs: 1 } }).problems.should.eql([])
        })

        it('reports patterns with nested repetition', function () {
            const { problems } = checkDocument({
                type: 'object',
                properties: { name: { type: 'string', pattern: '^(a+)+$' } },
                patternProperties: { '^(x+x+)+y$': { type: 'string' } }
            })
            problems.map(p => p.path).sort().should.eql(['/patternProperties/^(x+x+)+y$', '/properties/name/pattern'])
        })

        it('leaves a pattern that does not compile to the compiler', function () {
            const { problems } = checkDocument({ type: 'string', pattern: '([a-z]' })
            problems.should.have.length(1)
            problems[0].message.should.not.match(/too long to match/)
        })

        it('rejects a document nested deeper than the limit', function () {
            checkDocument(nested(MAX_DOCUMENT_DEPTH / 2)).problems.should.eql([])
            rejectedWith(() => checkDocument({ type: 'object', default: nested(MAX_DOCUMENT_DEPTH) }), 'document_too_deep')
        })

        it('rejects a document larger than the limit', function () {
            const doc = { type: 'string', description: 'x'.repeat(MAX_DOCUMENT_BYTES) }
            rejectedWith(() => checkDocument(doc), 'document_too_large')
        })
    })

    describe('removeId and setId', function () {
        it('removes the top level $id without changing the document passed in', function () {
            const doc = { $id: 'https://example.com/a', type: 'string' }
            removeId(doc).should.eql({ type: 'string' })
            doc.should.have.property('$id')
        })

        it('sets the platform $id', function () {
            const doc = setId({ $id: 'mine', type: 'string' }, 'abc123', '1.2.0')
            doc.should.eql({ $id: 'urn:flowfuse:schema:abc123:1.2.0', type: 'string' })
            checkDocument(doc).problems.should.eql([])
        })
    })

    describe('validatePayload', function () {
        it('accepts a valid payload', function () {
            validatePayload(temperature, { value: 21.5, sensor: 'line-4', readAt: '2026-11-18T10:00:00Z' }).should.eql({ valid: true, errors: [] })
        })

        it('returns every error with its path', function () {
            const result = validatePayload(temperature, { value: 'hot', sensor: 'Line 4', readAt: 'yesterday' })
            result.valid.should.be.false()
            result.errors.map(e => [e.path, e.keyword]).should.eql([
                ['/value', 'type'],
                ['/sensor', 'pattern'],
                ['/readAt', 'format']
            ])
        })

        it('reports a missing required field on the field path', function () {
            const result = validatePayload(temperature, { value: 1 })
            result.errors.should.have.length(1)
            result.errors[0].path.should.equal('/sensor')
            result.errors[0].keyword.should.equal('required')
        })

        it('validates any JSON value as the payload', function () {
            validatePayload({ type: 'number' }, 4).valid.should.be.true()
            validatePayload({ type: 'number' }, null).valid.should.be.false()
        })

        it('compiles a published document more than once', function () {
            const doc = setId(temperature, 'abc123', '1.0.0')
            validatePayload(doc, { value: 1, sensor: 'a-1' }).valid.should.be.true()
            validatePayload(doc, { value: 1, sensor: 'a-1' }).valid.should.be.true()
        })

        it('refuses a document with problems', function () {
            rejectedWith(() => validatePayload({ type: 'string', pattern: '^(a+)+$' }, 'aaaa'), 'invalid_schema', '/pattern')
            rejectedWith(() => validatePayload({ type: 'numbr' }, 1), 'invalid_schema')
        })

        it('refuses a payload larger than the limit', function () {
            rejectedWith(() => validatePayload({ type: 'string' }, 'x'.repeat(MAX_PAYLOAD_BYTES)), 'payload_too_large')
        })
    })
})
