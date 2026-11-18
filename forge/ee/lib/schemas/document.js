const Ajv2020 = require('ajv/dist/2020')
const addFormats = require('ajv-formats')
const safeRegex = require('safe-regex2')

const SCHEMA_DIALECT = 'https://json-schema.org/draft/2020-12/schema'

const MAX_DOCUMENT_BYTES = 256 * 1024
const MAX_DOCUMENT_DEPTH = 32
const MAX_PAYLOAD_BYTES = 1024 * 1024
const MAX_PAYLOAD_DEPTH = 64
const MAX_VALIDATION_ERRORS = 100

// Annotation keywords that are not part of JSON Schema but are accepted in a document
const ANNOTATION_KEYWORDS = ['unit']

// Not supported until schemas can reference each other. `$id` is only allowed at the top level.
const REFERENCE_KEYWORDS = ['$ref', '$dynamicRef', '$recursiveRef', '$defs', 'definitions', '$anchor', '$dynamicAnchor', '$recursiveAnchor', '$id']

// Keywords whose value is a subschema, a list of subschemas or a map of subschemas.
// Only these are walked, so a property named `$ref` or a `$ref` inside `default` is not a reference.
const SUBSCHEMA_KEYWORDS = ['additionalProperties', 'propertyNames', 'items', 'contains', 'not', 'if', 'then', 'else', 'unevaluatedItems', 'unevaluatedProperties', 'contentSchema']
const SUBSCHEMA_LIST_KEYWORDS = ['allOf', 'anyOf', 'oneOf', 'prefixItems']
const SUBSCHEMA_MAP_KEYWORDS = ['properties', 'patternProperties', 'dependentSchemas']

// Every keyword a schema may use. Anything else is reported, so a keyword is never accepted without being screened.
const ACCEPTED_KEYWORDS = new Set([
    ...SUBSCHEMA_KEYWORDS,
    ...SUBSCHEMA_LIST_KEYWORDS,
    ...SUBSCHEMA_MAP_KEYWORDS,
    ...ANNOTATION_KEYWORDS,
    '$comment',
    'type', 'enum', 'const',
    'multipleOf', 'maximum', 'exclusiveMaximum', 'minimum', 'exclusiveMinimum',
    'maxLength', 'minLength', 'pattern', 'format',
    'maxItems', 'minItems', 'uniqueItems', 'maxContains', 'minContains',
    'maxProperties', 'minProperties', 'required', 'dependentRequired',
    'contentEncoding', 'contentMediaType',
    'title', 'description', 'default', 'deprecated', 'readOnly', 'writeOnly', 'examples'
])

/**
 * A document that is rejected outright rather than saved with problems.
 */
class SchemaDocumentError extends Error {
    /**
     * @param {'references_not_supported' | 'document_too_large' | 'document_too_deep' | 'payload_too_large' | 'payload_too_deep' | 'invalid_schema'} code
     * @param {string} message
     * @param {string} [path] JSON Pointer into the document
     */
    constructor (code, message, path) {
        super(message)
        this.code = code
        this.path = path
    }
}

function isPlainObject (value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function escapePointer (segment) {
    return segment.replace(/~/g, '~0').replace(/\//g, '~1')
}

function jsonDepth (value, limit) {
    let maxDepth = 0
    const stack = [[value, 1]]
    while (stack.length > 0) {
        const [current, depth] = stack.pop()
        if (current === null || typeof current !== 'object') {
            continue
        }
        if (depth > maxDepth) {
            maxDepth = depth
            if (maxDepth > limit) {
                return maxDepth
            }
        }
        for (const child of Object.values(current)) {
            stack.push([child, depth + 1])
        }
    }
    return maxDepth
}

function serializedBytes (value) {
    return Buffer.byteLength(JSON.stringify(value) ?? '', 'utf8')
}

function checkLimits (doc) {
    if (jsonDepth(doc, MAX_DOCUMENT_DEPTH) > MAX_DOCUMENT_DEPTH) {
        throw new SchemaDocumentError('document_too_deep', `The schema is nested more than ${MAX_DOCUMENT_DEPTH} levels deep`)
    }
    if (serializedBytes(doc) > MAX_DOCUMENT_BYTES) {
        throw new SchemaDocumentError('document_too_large', `The schema is larger than ${MAX_DOCUMENT_BYTES / 1024} KB`)
    }
}

function walkSchema (schema, path, visit) {
    if (!isPlainObject(schema)) {
        return
    }
    visit(schema, path)
    for (const keyword of SUBSCHEMA_KEYWORDS) {
        if (Object.hasOwn(schema, keyword)) {
            walkSchema(schema[keyword], `${path}/${keyword}`, visit)
        }
    }
    for (const keyword of SUBSCHEMA_LIST_KEYWORDS) {
        if (Array.isArray(schema[keyword])) {
            schema[keyword].forEach((subschema, index) => {
                walkSchema(subschema, `${path}/${keyword}/${index}`, visit)
            })
        }
    }
    for (const keyword of SUBSCHEMA_MAP_KEYWORDS) {
        if (Object.hasOwn(schema, keyword) && isPlainObject(schema[keyword])) {
            for (const [name, subschema] of Object.entries(schema[keyword])) {
                walkSchema(subschema, `${path}/${keyword}/${escapePointer(name)}`, visit)
            }
        }
    }
}

/**
 * Screen a regex for nested repetition that can take exponential time to match.
 * Patterns that do not compile are left to AJV, which reports them.
 */
function isSafePattern (pattern) {
    let regex
    try {
        regex = new RegExp(pattern, 'u')
    } catch (err) {
        return true
    }
    return safeRegex(regex)
}

const UNSAFE_PATTERN_MESSAGE = 'This pattern can take too long to match; avoid nesting repetition such as (a+)+'

function createAjv () {
    // A new instance per compile, so a document's $id never clashes with one compiled earlier
    const ajv = new Ajv2020({
        allErrors: true,
        strictTypes: false,
        strictTuples: false,
        logger: false
    })
    addFormats(ajv)
    for (const keyword of ANNOTATION_KEYWORDS) {
        ajv.addKeyword({ keyword, schemaType: 'string' })
    }
    return ajv
}

/**
 * Check a schema document.
 *
 * Throws a `SchemaDocumentError` for a document that cannot be saved at all: one that is not an object,
 * one over the size or depth limits, or one using references. Anything else that stops the document
 * compiling is returned as a problem, so a draft can be saved while it is being written.
 * @param {*} doc the parsed document
 * @returns {{ problems: { path: string, message: string }[] }}
 */
function checkDocument (doc) {
    if (!isPlainObject(doc)) {
        throw new SchemaDocumentError('invalid_schema', 'The schema must be a JSON object')
    }
    checkLimits(doc)

    const problems = []
    let unsupported = false
    walkSchema(doc, '', (schema, path) => {
        for (const keyword of Object.keys(schema)) {
            if (path === '' && (keyword === '$schema' || keyword === '$id')) {
                continue
            }
            if (REFERENCE_KEYWORDS.includes(keyword)) {
                throw new SchemaDocumentError('references_not_supported', `${keyword} is not supported`, `${path}/${escapePointer(keyword)}`)
            }
            if (!ACCEPTED_KEYWORDS.has(keyword)) {
                unsupported = true
                problems.push({ path: `${path}/${escapePointer(keyword)}`, message: `${keyword} is not a supported keyword` })
            }
        }
        if (typeof schema.pattern === 'string' && !isSafePattern(schema.pattern)) {
            problems.push({ path: `${path}/pattern`, message: UNSAFE_PATTERN_MESSAGE })
        }
        if (isPlainObject(schema.patternProperties)) {
            for (const pattern of Object.keys(schema.patternProperties)) {
                if (!isSafePattern(pattern)) {
                    problems.push({ path: `${path}/patternProperties/${escapePointer(pattern)}`, message: UNSAFE_PATTERN_MESSAGE })
                }
            }
        }
    })

    if (unsupported) {
        return { problems }
    }

    if (Object.hasOwn(doc, '$schema') && doc.$schema !== SCHEMA_DIALECT) {
        problems.push({ path: '/$schema', message: `$schema must be ${SCHEMA_DIALECT}` })
        return { problems }
    }

    const ajv = createAjv()
    if (!ajv.validateSchema(doc)) {
        for (const error of ajv.errors) {
            problems.push({ path: error.instancePath, message: error.message })
        }
        return { problems }
    }
    try {
        ajv.compile(doc)
    } catch (err) {
        problems.push({ path: '', message: err.message })
    }
    return { problems }
}

/**
 * @returns {object} a copy of the document without its top level `$id`
 */
function removeId (doc) {
    const { $id, ...rest } = doc
    return rest
}

/**
 * @returns {object} a copy of the document with the `$id` the platform gives a published version
 */
function setId (doc, schemaId, version) {
    return { $id: `urn:flowfuse:schema:${schemaId}:${version}`, ...removeId(doc) }
}

/**
 * Validate a payload against a schema document. Nothing is stored or cached.
 * Throws a `SchemaDocumentError` when the payload is over the size or depth limit or the document has problems.
 * Returns at most `MAX_VALIDATION_ERRORS` errors.
 * @returns {{ valid: boolean, errors: { path: string, keyword: string, message: string, params: object }[] }}
 */
function validatePayload (doc, payload) {
    if (jsonDepth(payload, MAX_PAYLOAD_DEPTH) > MAX_PAYLOAD_DEPTH) {
        throw new SchemaDocumentError('payload_too_deep', `The payload is nested more than ${MAX_PAYLOAD_DEPTH} levels deep`)
    }
    if (serializedBytes(payload) > MAX_PAYLOAD_BYTES) {
        throw new SchemaDocumentError('payload_too_large', `The payload is larger than ${MAX_PAYLOAD_BYTES / 1024 / 1024} MB`)
    }
    const { problems } = checkDocument(doc)
    if (problems.length > 0) {
        throw new SchemaDocumentError('invalid_schema', 'The schema has problems and cannot be used for validation', problems[0].path)
    }
    const validate = createAjv().compile(doc)
    if (validate(payload)) {
        return { valid: true, errors: [] }
    }
    const errors = validate.errors.slice(0, MAX_VALIDATION_ERRORS).map(error => {
        let path = error.instancePath
        if (error.keyword === 'required') {
            path = `${path}/${escapePointer(error.params.missingProperty)}`
        }
        return { path, keyword: error.keyword, message: error.message, params: error.params }
    })
    return { valid: false, errors }
}

module.exports = {
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
}
