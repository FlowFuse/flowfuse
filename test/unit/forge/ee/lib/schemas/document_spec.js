const should = require('should')

const {
    SCHEMA_DIALECT,
    MAX_DOCUMENT_BYTES,
    MAX_DOCUMENT_DEPTH,
    MAX_PAYLOAD_BYTES,
    MAX_PAYLOAD_DEPTH,
    MAX_VALIDATION_ERRORS,
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
        value: { type: 'number', unit: 'Cel' },
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

        it('rejects a document that is not an object', function () {
            for (const doc of [[], 'string', true, null]) {
                rejectedWith(() => checkDocument(doc), 'invalid_schema')
            }
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
            problems.should.eql([{ path: '/minLenght', message: 'minLenght is not a supported keyword' }])
        })

        it('reports keywords from older drafts, without looking inside them', function () {
            checkDocument({ dependencies: { a: { $ref: '#' } } }).problems.map(p => p.path).should.eql(['/dependencies'])
            checkDocument({ properties: { a: { additionalItems: false } } }).problems.map(p => p.path).should.eql(['/properties/a/additionalItems'])
        })

        it('reports an unknown format', function () {
            checkDocument({ type: 'string', format: 'not-a-format' }).problems.should.have.length(1)
        })

        it('accepts the unit annotation only as a string', function () {
            checkDocument({ type: 'number', unit: 'kPa' }).problems.should.eql([])
            checkDocument({ type: 'number', unit: 5 }).problems.should.have.length(1)
        })

        it('rejects every reference keyword, including those from older drafts', function () {
            rejectedWith(() => checkDocument({ properties: { a: { $recursiveRef: '#' } } }), 'references_not_supported', '/properties/a/$recursiveRef')
            rejectedWith(() => checkDocument({ definitions: { a: { type: 'string' } } }), 'references_not_supported', '/definitions')
            rejectedWith(() => checkDocument({ allOf: [{ $anchor: 'a' }] }), 'references_not_supported', '/allOf/0/$anchor')
            rejectedWith(() => checkDocument({ $dynamicAnchor: 'a' }), 'references_not_supported', '/$dynamicAnchor')
        })

        it('accepts $id and $schema only at the top level', function () {
            checkDocument({ $id: 'https://example.com/a', type: 'string' }).problems.should.eql([])
            rejectedWith(() => checkDocument({ properties: { a: { $id: 'urn:flowfuse:schema:other:1.0.0' } } }), 'references_not_supported', '/properties/a/$id')
            checkDocument({ properties: { a: { $schema: SCHEMA_DIALECT } } }).problems.map(p => p.path).should.eql(['/properties/a/$schema'])
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

        it('accepts patterns with nested repetition', function () {
            checkDocument({ type: 'string', pattern: '^(a+)+$' }).problems.should.eql([])
            checkDocument({ type: 'string', pattern: '^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(?:-([0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*))?$' }).problems.should.eql([])
        })

        it('reports patterns RE2 cannot run, with their path', function () {
            const { problems } = checkDocument({
                type: 'object',
                properties: { name: { type: 'string', pattern: '(?<=a)b' } },
                patternProperties: { '^(x)\\1$': { type: 'string' } }
            })
            problems.map(p => p.path).sort().should.eql(['/patternProperties/^(x)\\1$', '/properties/name/pattern'])
            problems[0].message.should.match(/lookaround or backreferences/)
        })

        it('reports a pattern that does not compile', function () {
            checkDocument({ type: 'string', pattern: '([a-z]' }).problems.should.have.length(1)
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

        it('names the allowed values, the constant and the types an error is about', function () {
            const doc = {
                type: 'object',
                properties: {
                    unit: { enum: ['Cel', 'degF', 1, null] },
                    kind: { const: { on: true } },
                    code: { type: ['string', 'null'] },
                    level: { type: 'integer' },
                    big: { enum: Array.from({ length: 12 }, (_, index) => index) }
                }
            }
            const result = validatePayload(doc, { unit: 'x', kind: 1, code: 4, level: 'a', big: 99 })
            result.errors.map(e => [e.path, e.message]).should.eql([
                ['/unit', 'must be one of "Cel", "degF", 1 or null'],
                ['/kind', 'must be {"on":true}'],
                ['/code', 'must be string or null'],
                ['/level', 'must be integer'],
                ['/big', 'must be one of 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 and 2 more']
            ])
        })

        it('reports a field that is not allowed on the field path', function () {
            const result = validatePayload({ type: 'object', properties: { a: { type: 'string' } }, additionalProperties: false }, { a: 'x', 'b/c': 1 })
            result.errors.map(e => [e.path, e.keyword, e.message]).should.eql([['/b~1c', 'additionalProperties', 'must NOT have additional properties']])
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

        it('matches patterns in linear time', function () {
            const doc = { type: 'object', properties: { a: { type: 'string', pattern: '.*.*.*x$' } }, patternProperties: { '^(b+)+$': { type: 'number' } } }
            const started = Date.now()
            const result = validatePayload(doc, { a: 'a'.repeat(100000), [`${'b'.repeat(1000)}!`]: 'skipped', bbbb: 'not a number' })
            ;(Date.now() - started).should.be.below(1000)
            result.errors.map(e => [e.path, e.keyword]).should.eql([['/a', 'pattern'], ['/bbbb', 'type']])
        })

        it('refuses a document with problems', function () {
            rejectedWith(() => validatePayload({ type: 'string', pattern: '(?=a)' }, 'aaaa'), 'invalid_schema', '/pattern')
            rejectedWith(() => validatePayload({ type: 'numbr' }, 1), 'invalid_schema')
        })

        it('refuses a payload larger than the limit', function () {
            rejectedWith(() => validatePayload({ type: 'string' }, 'x'.repeat(MAX_PAYLOAD_BYTES)), 'payload_too_large')
        })

        it('refuses a payload nested deeper than the limit', function () {
            let payload = 1
            for (let i = 0; i < 20000; i++) {
                payload = [payload]
            }
            rejectedWith(() => validatePayload({}, payload), 'payload_too_deep')

            payload = 1
            for (let i = 1; i < MAX_PAYLOAD_DEPTH; i++) {
                payload = [payload]
            }
            validatePayload({}, payload).valid.should.be.true()
        })

        it('returns at most the error limit', function () {
            const result = validatePayload({ type: 'array', items: { type: 'string' } }, new Array(1000).fill(1))
            result.valid.should.be.false()
            result.errors.should.have.length(MAX_VALIDATION_ERRORS)
        })
    })
})
