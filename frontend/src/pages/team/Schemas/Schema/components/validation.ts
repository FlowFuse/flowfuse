import { escapePointer, isObject } from './pointer'
import { COMBINATORS, type Schema, typeLabel, typesOf } from './schemaTypes'

import type { ValidationError } from '@/api/schemas'

export type RowResult = 'pass' | 'fail' | 'optional' | 'extra'

export interface ValidationRow {
    path: string
    type: string
    value: string
    present: boolean
    result: RowResult
    message: string
}

const MISSING = Symbol('missing')

const DEFAULT_MESSAGES: Record<RowResult, string> = {
    pass: 'Passes',
    fail: '',
    optional: 'Not present (optional)',
    extra: 'Not in schema (additionalProperties: true)'
}

// What lets an object have a field its schema does not list
function extraMessage (objectSchema: Schema, name: string): string {
    const patterns = isObject(objectSchema.patternProperties) ? Object.keys(objectSchema.patternProperties) : []
    if (patterns.some(pattern => matches(pattern, name))) {
        return 'Checked by patternProperties'
    }
    if (isObject(objectSchema.additionalProperties)) {
        return 'Checked by the additionalProperties schema'
    }
    return DEFAULT_MESSAGES.extra
}

function matches (pattern: string, text: string): boolean {
    try {
        return new RegExp(pattern, 'u').test(text)
    } catch {
        return false
    }
}

export function valueLabel (value: unknown): string {
    if (isObject(value)) {
        const count = Object.keys(value).length
        return `{ ${count} ${count === 1 ? 'field' : 'fields'} }`
    }
    return JSON.stringify(value)
}

/**
 * One row per field of the schema, and per field the message has that the schema does not list.
 * Fields of an object the message does not have are left out, as they can only be missing too.
 * A row fails only from an error of the server. Each error goes to the row of its field, or of the closest field
 * above it, for errors inside arrays and inside `oneOf` / `anyOf` branches. A row with several errors shows the
 * combinator's own one, or else the first.
 */
export function validationRows (schema: Schema, payload: unknown, errors: ValidationError[]): ValidationRow[] {
    const rows: ValidationRow[] = []

    function visit (fieldSchema: Schema, value: unknown, path: string) {
        const present = value !== MISSING
        rows.push({ path: path || '/', type: typeLabel(fieldSchema), value: present ? valueLabel(value) : 'missing', present, result: present ? 'pass' : 'optional', message: '' })
        if (!present || !isObject(fieldSchema) || !isObject(value) || !isObject(fieldSchema.properties)) {
            return
        }
        for (const [name, child] of Object.entries(fieldSchema.properties)) {
            visit(child, Object.hasOwn(value, name) ? value[name] : MISSING, `${path}/${escapePointer(name)}`)
        }
        for (const name of Object.keys(value)) {
            if (Object.hasOwn(fieldSchema.properties, name)) {
                continue
            }
            rows.push({ path: `${path}/${escapePointer(name)}`, type: 'not in schema', value: valueLabel(value[name]), present: true, result: 'extra', message: extraMessage(fieldSchema, name) })
        }
    }
    visit(schema, payload, '')

    const byPath = new Map(rows.map(row => [row.path, row]))
    const rowFor = (path: string) => {
        let current = path || '/'
        while (!byPath.has(current)) {
            current = current.slice(0, current.lastIndexOf('/')) || '/'
        }
        return byPath.get(current)!
    }
    const rowErrors = new Map<ValidationRow, ValidationError[]>()
    for (const error of errors) {
        const row = rowFor(error.path)
        rowErrors.set(row, [...(rowErrors.get(row) ?? []), error])
    }
    for (const [row, list] of rowErrors) {
        const shown = list.find(error => error.path === row.path && COMBINATORS.includes(error.keyword)) ??
            list.find(error => error.path === row.path) ??
            list[0]
        row.result = 'fail'
        const inside = shown.path.slice(row.path === '/' ? 0 : row.path.length)
        row.message = inside ? `${inside}: ${shown.message}` : shown.message
    }
    // The message itself only gets a row of its own when it fails as a whole, as an object's fields say more
    if (rows[0].result !== 'fail' && isObject(schema) && isObject(payload)) {
        rows.shift()
    }
    for (const row of rows) {
        if (row.message) {
            continue
        }
        row.message = DEFAULT_MESSAGES[row.result]
    }
    return rows
}

const SAMPLE_FORMATS: Record<string, string> = {
    'date-time': '2026-01-01T00:00:00Z',
    date: '2026-01-01',
    time: '00:00:00Z',
    email: 'name@example.com',
    uri: 'https://example.com',
    uuid: '00000000-0000-4000-8000-000000000000',
    hostname: 'example.com',
    ipv4: '192.0.2.1'
}

/**
 * A string matching a simple pattern: literal characters, `\d`, `\w`, character classes and `{n}`, `{n,m}`, `?`, `+`, `*`.
 * Groups, alternation and lookarounds are beyond this, which gives `undefined`.
 */
export function sampleForPattern (pattern: string): string | undefined {
    let source = pattern
    if (source.startsWith('^')) source = source.slice(1)
    if (source.endsWith('$') && !source.endsWith('\\$')) source = source.slice(0, -1)
    let result = ''
    let index = 0
    while (index < source.length) {
        let piece: string
        const char = source[index]
        if ('()|'.includes(char)) return undefined
        if (char === '\\') {
            const escaped = source[index + 1]
            if (escaped === undefined) return undefined
            piece = escaped === 'd' ? '0' : escaped === 'w' ? 'a' : escaped === 's' ? ' ' : /[a-zA-Z]/.test(escaped) ? '' : escaped
            if (piece === '') return undefined
            index += 2
        } else if (char === '[') {
            const end = source.indexOf(']', index + 1)
            if (end === -1 || source[index + 1] === '^') return undefined
            const set = source.slice(index + 1, end)
            piece = set.startsWith('\\d') ? '0' : set.startsWith('\\w') ? 'a' : set[0]
            if (!piece || piece === '\\') return undefined
            index = end + 1
        } else if (char === '.') {
            piece = 'a'
            index += 1
        } else if ('*+?{'.includes(char)) {
            return undefined
        } else {
            piece = char
            index += 1
        }
        let count = 1
        const quantifier = source.slice(index).match(/^(\{(\d+)(,(\d*))?\}|\?|\*|\+)/)
        if (quantifier) {
            count = quantifier[2] !== undefined ? parseInt(quantifier[2]) : quantifier[0] === '+' ? 1 : 0
            index += quantifier[0].length
        }
        result += piece.repeat(count)
    }
    return result
}

function sampleNumber (schema: Schema, integer: boolean): number {
    const minimum = typeof schema.minimum === 'number' ? schema.minimum : typeof schema.exclusiveMinimum === 'number' ? schema.exclusiveMinimum + 1 : undefined
    const maximum = typeof schema.maximum === 'number' ? schema.maximum : typeof schema.exclusiveMaximum === 'number' ? schema.exclusiveMaximum - 1 : undefined
    let value = minimum ?? Math.min(0, maximum ?? 0)
    if (integer) value = Math.ceil(value)
    return value
}

/**
 * A message that matches the schema, to start from: `examples`, then `default`, `const` and the first `enum` value,
 * then a value per type that keeps to the simple constraints. Every field is filled in, optional ones too.
 * A string with a `pattern` too involved to follow is a placeholder to replace.
 */
export function exampleFromSchema (schema: Schema): unknown {
    return sample(schema) ?? null
}

// Two examples for the same value: objects are combined, otherwise the later one wins unless it has nothing to say
function combine (first: unknown, second: unknown): unknown {
    if (isObject(first) && isObject(second)) return { ...first, ...second }
    return second === undefined ? first : second
}

// Undefined when the schema says nothing about the value, so that a branch with only `required` doesn't replace it
function sample (schema: Schema): unknown {
    if (!isObject(schema)) return undefined
    if (Array.isArray(schema.examples) && schema.examples.length) return schema.examples[0]
    if (Object.hasOwn(schema, 'default')) return schema.default
    if (Object.hasOwn(schema, 'const')) return schema.const
    if (Array.isArray(schema.enum) && schema.enum.length) return schema.enum[0]
    // A schema can list fields and combine branches at the same level, so the value also has to match the first
    // branch of each `oneOf` / `anyOf` and every part of `allOf`
    const parts: Schema[] = Array.isArray(schema.allOf) ? [...schema.allOf as Schema[]] : []
    for (const keyword of ['oneOf', 'anyOf']) {
        const branches = schema[keyword]
        if (Array.isArray(branches) && branches.length) parts.push(branches[0])
    }
    return parts.reduce((merged: unknown, part) => combine(merged, sample(part)), sampleOwnType(schema))
}

function sampleOwnType (schema: Schema): unknown {
    const types = typesOf(schema)
    const type = types.find(candidate => candidate !== 'null') ?? types[0] ?? (isObject(schema.properties) ? 'object' : undefined)
    switch (type) {
    case 'object':
        return Object.fromEntries(Object.entries(schema.properties ?? {}).map(([name, child]) => [name, exampleFromSchema(child)]))
    case 'array': {
        const count = Math.max(1, typeof schema.minItems === 'number' ? schema.minItems : 1)
        const items = schema.items
        if (!isObject(items)) return []
        // with unique items, a fixed value per item would repeat, so one item is all that is given
        return Array.from({ length: schema.uniqueItems ? 1 : count }, () => exampleFromSchema(items))
    }
    case 'string': {
        if (typeof schema.format === 'string' && SAMPLE_FORMATS[schema.format]) return SAMPLE_FORMATS[schema.format]
        const matching = typeof schema.pattern === 'string' ? sampleForPattern(schema.pattern) : undefined
        if (matching !== undefined) return matching
        const text = 'text'
        const minLength = typeof schema.minLength === 'number' ? schema.minLength : 0
        return text.padEnd(minLength, 'x').slice(0, typeof schema.maxLength === 'number' ? Math.max(schema.maxLength, minLength) : undefined)
    }
    case 'number':
        return sampleNumber(schema, false)
    case 'integer':
        return sampleNumber(schema, true)
    case 'boolean':
        return false
    case 'null':
        return null
    default:
        return undefined
    }
}
