// The keywords of a field's schema the builder reads, and any others it keeps as they are
export interface FieldSchema {
    type?: string | string[]
    description?: string
    properties?: Record<string, FieldSchema>
    required?: string[]
    items?: FieldSchema
    additionalProperties?: boolean | FieldSchema
    enum?: unknown[]
    minimum?: number
    maximum?: number
    minLength?: number
    maxLength?: number
    pattern?: string
    format?: string
    minItems?: number
    maxItems?: number
    uniqueItems?: boolean
    [keyword: string]: unknown
}

// Keywords the builder can't show as fields. A field using one is shown read-only, to be changed in the JSON
export const JSON_ONLY_KEYWORDS = ['oneOf', 'anyOf', 'allOf', 'not', 'if', 'then', 'else', 'patternProperties', 'prefixItems', 'dependentSchemas', 'dependentRequired', 'unevaluatedProperties', 'unevaluatedItems', 'contains', 'propertyNames', 'const']

export interface FieldRow {
    // JSON Pointer to the field's own schema, which is unique and stays put while the table changes
    pointer: string
    // the field's path in a message, as the other schema pages show it
    path: string
    name: string
    depth: number
    type: string
    required: boolean
    constraints: string
    description: string
    // fields a row holds, for an object or an array of objects
    children: number | null
    expanded: boolean
    // the field's fields are too deep to show indented, so they open in a view of their own
    drillIn: boolean
    jsonOnly: boolean
}

// How many levels of fields the table shows indented. Fields deeper than that open in a drill-in view
export const INLINE_LEVELS = 3

const unescapePointer = (segment: string) => segment.replace(/~1/g, '/').replace(/~0/g, '~')

// The schema at a JSON Pointer, '' being the root
export function schemaAt (root: FieldSchema, pointer: string): FieldSchema {
    return pointer.split('/').slice(1).map(unescapePointer).reduce<unknown>((schema, segment) => (schema as Record<string, unknown> | undefined)?.[segment], root) as FieldSchema
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
        if (segments[index] !== 'properties' || index + 1 >= segments.length) continue
        const name = segments[++index]
        current += `/${name}`
        path += `/${name}`
        trail.push({ name: unescapePointer(name), pointer: current, path })
    }
    return trail
}

const isObject = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)
const escapePointer = (segment: string) => segment.replace(/~/g, '~0').replace(/\//g, '~1')

export const typesOf = (schema: FieldSchema): string[] => Array.isArray(schema.type) ? schema.type : schema.type ? [schema.type] : []

// The object schema holding a field's fields: the field itself, or its items for an array of objects
export function fieldsHolder (schema: FieldSchema): { schema: FieldSchema, suffix: string } | null {
    if (isObject(schema.properties) || typesOf(schema).includes('object')) return { schema, suffix: '' }
    const items = schema.items
    if (typesOf(schema).includes('array') && isObject(items) && (isObject(items.properties) || typesOf(items).includes('object'))) {
        return { schema: items, suffix: '/items' }
    }
    return null
}

export function isJsonOnly (schema: FieldSchema): boolean {
    return JSON_ONLY_KEYWORDS.some(keyword => Object.hasOwn(schema, keyword)) || (isObject(schema.items) && isJsonOnly(schema.items))
}

// The type as the mocks write it: `string | null`, `array of string`, `oneOf (2)`
export function typeLabel (schema: FieldSchema): string {
    const combinator = ['oneOf', 'anyOf', 'allOf'].find(keyword => Array.isArray(schema[keyword]))
    if (combinator) return `${combinator} (${(schema[combinator] as unknown[]).length})`
    if (Object.hasOwn(schema, 'const')) return 'const'
    const types = typesOf(schema)
    if (!types.length) return isObject(schema.properties) ? 'object' : 'any'
    return types.map(type => type === 'array' && isObject(schema.items) ? `array of ${typeLabel(schema.items)}` : type).join(' | ')
}

const short = (value: unknown) => typeof value === 'string' ? value : JSON.stringify(value)

// The constraints of a field on one line, as the field table shows them
export function constraintsSummary (schema: FieldSchema): string {
    if (isJsonOnly(schema)) return 'Not editable in the builder'
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
        const count = Object.keys(holder.schema.properties ?? {}).length
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
export function builderRows (root: FieldSchema, expanded: Set<string>, focus = ''): FieldRow[] {
    const rows: FieldRow[] = []

    function visitFields (holder: FieldSchema, pointer: string, path: string, depth: number) {
        const required = Array.isArray(holder.required) ? holder.required : []
        for (const [name, schema] of Object.entries(isObject(holder.properties) ? holder.properties : {})) {
            const field = isObject(schema) ? schema as FieldSchema : {}
            const fieldPointer = `${pointer}/properties/${escapePointer(name)}`
            const fieldPath = `${path}/${escapePointer(name)}`
            const jsonOnly = isJsonOnly(field)
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
                constraints: constraintsSummary(field),
                description: typeof field.description === 'string' ? field.description : '',
                children: inner ? Object.keys(inner.schema.properties ?? {}).length : null,
                expanded: open,
                drillIn: !!inner && !inline,
                jsonOnly
            })
            if (open && inner) visitFields(inner.schema, fieldPointer + inner.suffix, fieldPath, depth + 1)
        }
    }

    const focused = focus ? fieldsHolder(schemaAt(root, focus) ?? {}) : null
    if (focused) {
        visitFields(focused.schema, focus + focused.suffix, fieldTrail(focus).at(-1)?.path ?? '', 0)
    } else if (fieldsHolder(root)?.suffix === '') {
        visitFields(root, '', '', 0)
    } else {
        rows.push({ pointer: '', path: '/', name: '(message)', depth: 0, type: typeLabel(root), required: true, constraints: constraintsSummary(root), description: typeof root.description === 'string' ? root.description : '', children: null, expanded: false, drillIn: false, jsonOnly: isJsonOnly(root) })
    }
    return rows
}

// Whether the root object takes fields its schema doesn't list, which JSON Schema allows unless told otherwise
export function allowsOtherFields (schema: FieldSchema): boolean {
    return schema.additionalProperties !== false
}
