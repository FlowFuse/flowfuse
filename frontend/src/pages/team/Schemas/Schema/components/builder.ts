import { escapePointer, isObject, unescapePointer } from './pointer'
import { REFERENCE_KEYWORDS, referenceMessage } from './referenceProblems'
import { COMBINATORS, type Schema, typeLabel, typesOf } from './schemaTypes'

// Keywords the builder can't show as fields. A field using one is shown read-only, to be changed in the JSON
export const JSON_ONLY_KEYWORDS = [...COMBINATORS, 'not', 'if', 'then', 'else', 'patternProperties', 'prefixItems', 'dependentSchemas', 'dependentRequired', 'unevaluatedProperties', 'unevaluatedItems', 'contains', 'propertyNames', 'const']

export interface FieldRow {
    // JSON Pointer to the field's own schema, which is unique and stays put while the table changes
    pointer: string
    path: string
    name: string
    depth: number
    type: string
    required: boolean
    constraints: string
    description: string
    children: number | null
    expanded: boolean
    // the field's fields are too deep to show indented, so they open in a view of their own
    drillIn: boolean
    jsonOnly: boolean
    problem: string
}

// How many levels of fields the table shows indented. Fields deeper than that open in a drill-in view
export const INLINE_LEVELS = 3

export function schemaAt (root: Schema, pointer: string): Schema | undefined {
    let current: unknown = root
    for (const segment of pointer.split('/').slice(1).map(unescapePointer)) {
        if (!isObject(current) || !Object.hasOwn(current, segment)) {
            return undefined
        }
        current = current[segment]
    }
    return isObject(current) ? current as Schema : undefined
}

export function parseSchema (text: string): Schema | null {
    try {
        const value = JSON.parse(text)
        return isObject(value) ? value as Schema : null
    } catch {
        return null
    }
}

/**
 * The fields leading to a field, for the drill-in breadcrumb: each with its pointer and its path in a message.
 * `pointer` is a field's pointer, which goes through `properties` and, for arrays of objects, `items`.
 */
export function fieldTrail (pointer: string): { name: string, pointer: string, path: string }[] {
    const trail: { name: string, pointer: string, path: string }[] = []
    const segments = pointer.split('/').slice(1)
    let current = ''
    let path = ''
    for (let index = 0; index < segments.length; index++) {
        current += `/${segments[index]}`
        if (segments[index] !== 'properties' || index + 1 >= segments.length) {
            continue
        }
        const name = segments[++index]
        current += `/${name}`
        path += `/${name}`
        trail.push({ name: unescapePointer(name), pointer: current, path })
    }
    return trail
}

export const propertiesOf = (schema: Schema): Record<string, Schema> => isObject(schema.properties) ? schema.properties as Record<string, Schema> : {}

export function fieldsHolder (schema: Schema): { schema: Schema, suffix: string } | null {
    if (isObject(schema.properties) || typesOf(schema).includes('object')) {
        return { schema, suffix: '' }
    }
    const items = schema.items
    if (typesOf(schema).includes('array') && isObject(items) && (isObject(items.properties) || typesOf(items).includes('object'))) {
        return { schema: items, suffix: '/items' }
    }
    return null
}

export function isJsonOnly (schema: Schema): boolean {
    if (JSON_ONLY_KEYWORDS.some(keyword => Object.hasOwn(schema, keyword))) {
        return true
    }
    // the builder shows one type, with or without null
    if (typesOf(schema).filter(type => type !== 'null').length > 1) {
        return true
    }
    if (Array.isArray(schema.items)) {
        return true
    }
    return isObject(schema.items) && isJsonOnly(schema.items)
}

// A root may carry an $id
export function referenceProblem (schema: Schema, isRoot = false): string {
    const keyword = REFERENCE_KEYWORDS.find(name => Object.hasOwn(schema, name) && !(isRoot && name === '$id'))
    if (keyword) {
        return referenceMessage(keyword)
    }
    return isObject(schema.items) ? referenceProblem(schema.items) : ''
}

/**
 * What the builder can't show of a root that lists fields: keywords of the root itself, which a field's row has no place for.
 * A root that is not an object has a row of its own that says so instead.
 */
export function rootNotes (root: Schema): string[] {
    if (fieldsHolder(root)?.suffix !== '') {
        return []
    }
    const notes: string[] = []
    const problem = referenceProblem(root, true)
    if (problem) {
        notes.push(`${problem}, at the top level of the schema.`)
    }
    const keywords = JSON_ONLY_KEYWORDS.filter(keyword => Object.hasOwn(root, keyword))
    if (keywords.length) {
        notes.push(`The schema also uses ${keywords.join(', ')} at its top level, which the builder can't show.`)
    }
    return notes
}

const short = (value: unknown) => typeof value === 'string' ? value : JSON.stringify(value)

export function constraintsSummary (schema: Schema): string {
    if (isJsonOnly(schema)) {
        return 'Not editable in the builder'
    }
    const parts: string[] = []
    if (Array.isArray(schema.enum)) parts.push(`one of ${schema.enum.map(short).join(', ')}`)
    if (schema.minimum !== undefined) parts.push(`min ${schema.minimum}`)
    if (schema.maximum !== undefined) parts.push(`max ${schema.maximum}`)
    if (schema.exclusiveMinimum !== undefined) parts.push(`more than ${schema.exclusiveMinimum}`)
    if (schema.exclusiveMaximum !== undefined) parts.push(`less than ${schema.exclusiveMaximum}`)
    if (schema.minLength !== undefined) parts.push(`min length ${schema.minLength}`)
    if (schema.maxLength !== undefined) parts.push(`max length ${schema.maxLength}`)
    if (schema.pattern !== undefined) parts.push(`pattern ${schema.pattern}`)
    if (schema.format !== undefined) parts.push(`format ${schema.format}`)
    if (schema.minItems !== undefined) parts.push(`min items ${schema.minItems}`)
    if (schema.maxItems !== undefined) parts.push(`max items ${schema.maxItems}`)
    if (schema.uniqueItems) parts.push('unique items')
    const holder = fieldsHolder(schema)
    if (holder) {
        const count = Object.keys(propertiesOf(holder.schema)).length
        parts.push(`${count} ${count === 1 ? 'field' : 'fields'}`)
    }
    return parts.length ? parts.join(' · ') : 'None'
}

/**
 * The rows of the field table: every field of the root object, and the fields of an expanded object or array of objects
 * under it, down to `INLINE_LEVELS` levels. `expanded` holds the pointers of the expanded fields.
 * With `focus`, the pointer of an object or array of objects, the table is drilled into it and lists its fields instead.
 * A root that is not an object has a single row of its own.
 */
export function builderRows (root: Schema, expanded: Set<string>, focus = ''): FieldRow[] {
    const rows: FieldRow[] = []

    function visitFields (holder: Schema, pointer: string, path: string, depth: number) {
        const required = Array.isArray(holder.required) ? holder.required : []
        for (const [name, schema] of Object.entries(propertiesOf(holder))) {
            const field = isObject(schema) ? schema as Schema : {}
            const fieldPointer = `${pointer}/properties/${escapePointer(name)}`
            const fieldPath = `${path}/${escapePointer(name)}`
            const problem = referenceProblem(field)
            const jsonOnly = !!problem || isJsonOnly(field)
            const inner = jsonOnly ? null : fieldsHolder(field)
            const inline = depth < INLINE_LEVELS - 1
            const open = !!inner && inline && expanded.has(fieldPointer)
            rows.push({
                pointer: fieldPointer,
                path: fieldPath,
                name,
                depth,
                type: typeLabel(field),
                required: required.includes(name),
                constraints: problem || constraintsSummary(field),
                description: typeof field.description === 'string' ? field.description : '',
                children: inner ? Object.keys(propertiesOf(inner.schema)).length : null,
                expanded: open,
                drillIn: !!inner && !inline,
                jsonOnly,
                problem
            })
            if (open && inner) {
                visitFields(inner.schema, fieldPointer + inner.suffix, fieldPath, depth + 1)
            }
        }
    }

    const focused = focusedHolder(root, focus)
    if (focused) {
        visitFields(focused.schema, focus + focused.suffix, fieldTrail(focus).at(-1)?.path ?? '', 0)
    } else if (fieldsHolder(root)?.suffix === '') {
        visitFields(root, '', '', 0)
    } else {
        const problem = referenceProblem(root, true)
        rows.push({
            pointer: '',
            path: '/',
            name: '(message)',
            depth: 0,
            type: typeLabel(root),
            required: true,
            constraints: problem || constraintsSummary(root),
            description: typeof root.description === 'string' ? root.description : '',
            children: null,
            expanded: false,
            drillIn: false,
            jsonOnly: !!problem || isJsonOnly(root),
            problem
        })
    }
    return rows
}

export function focusedHolder (root: Schema, focus: string): { schema: Schema, suffix: string } | null {
    const field = focus ? schemaAt(root, focus) : undefined
    return field ? fieldsHolder(field) : null
}

export type OtherFields = 'allowed' | 'none' | 'schema'

// What an object does with fields its schema doesn't list: JSON Schema allows any unless told otherwise
export function otherFields (schema: Schema): OtherFields {
    if (schema.additionalProperties === false) {
        return 'none'
    }
    return isObject(schema.additionalProperties) ? 'schema' : 'allowed'
}
