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
    jsonOnly: boolean
    // in the published version and deleted in the draft
    deleted: boolean
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
 * under it. `expanded` holds the pointers of the expanded fields.
 * With `published`, a field it has that the root no longer has stays in the table as deleted, after the field it
 * followed there, so it can be put back.
 * A root that is not an object has a single row of its own.
 */
export function builderRows (root: FieldSchema, expanded: Set<string>, published?: FieldSchema | null): FieldRow[] {
    const rows: FieldRow[] = []

    function row (field: FieldSchema, name: string, pointer: string, path: string, depth: number, required: boolean, deleted: boolean): FieldRow {
        const jsonOnly = isJsonOnly(field)
        const inner = jsonOnly || deleted ? null : fieldsHolder(field)
        return {
            pointer,
            path,
            name,
            depth,
            type: typeLabel(field),
            required,
            constraints: constraintsSummary(field),
            description: typeof field.description === 'string' ? field.description : '',
            children: inner ? Object.keys(inner.schema.properties ?? {}).length : null,
            expanded: !!inner && expanded.has(pointer),
            jsonOnly,
            deleted
        }
    }

    // `before` is the object's schema in the published version, when it has one there
    function visitFields (holder: FieldSchema, before: FieldSchema | null, pointer: string, path: string, depth: number) {
        const fields = isObject(holder.properties) ? holder.properties : {}
        const names = Object.keys(fields)
        const gone = Object.keys(before?.properties ?? {}).filter(name => !Object.hasOwn(fields, name))
        // a deleted field goes after the last field before it in the published version that is still there
        const order = [...names]
        for (const name of gone) {
            const earlier = Object.keys(before!.properties!).slice(0, Object.keys(before!.properties!).indexOf(name)).reverse()
            const after = earlier.find(candidate => order.includes(candidate))
            order.splice(after ? order.indexOf(after) + 1 : 0, 0, name)
        }
        for (const name of order) {
            const deleted = !Object.hasOwn(fields, name)
            const field = (deleted ? before!.properties![name] : fields[name]) ?? {}
            const fieldPointer = `${pointer}/properties/${escapePointer(name)}`
            const required = ((deleted ? before!.required : holder.required) ?? []).includes(name)
            const entry = row(isObject(field) ? field : {}, name, fieldPointer, `${path}/${escapePointer(name)}`, depth, required, deleted)
            rows.push(entry)
            if (!entry.expanded) continue
            const inner = fieldsHolder(field)!
            const publishedField = before?.properties?.[name]
            const publishedInner = publishedField && isObject(publishedField) ? fieldsHolder(publishedField) : null
            visitFields(inner.schema, publishedInner?.suffix === inner.suffix ? publishedInner.schema : null, fieldPointer + inner.suffix, entry.path, depth + 1)
        }
    }

    if (fieldsHolder(root)?.suffix === '') {
        visitFields(root, published && fieldsHolder(published)?.suffix === '' ? published : null, '', '', 0)
    } else {
        rows.push(row(root, '(message)', '', '/', 0, true, false))
    }
    return rows
}

// Whether the root object takes fields its schema doesn't list, which JSON Schema allows unless told otherwise
export function allowsOtherFields (schema: FieldSchema): boolean {
    return schema.additionalProperties !== false
}
