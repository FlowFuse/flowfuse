import { isObject } from './pointer'

export interface Schema {
    type?: string | string[]
    properties?: Record<string, Schema>
    required?: string[]
    items?: Schema
    description?: string
    additionalProperties?: boolean | Schema
    enum?: unknown[]
    maxItems?: number
    format?: string
    pattern?: string
    minimum?: number
    maximum?: number
    exclusiveMinimum?: number
    exclusiveMaximum?: number
    minLength?: number
    maxLength?: number
    minItems?: number
    uniqueItems?: boolean
    [keyword: string]: unknown
}

export const COMBINATORS = ['oneOf', 'anyOf', 'allOf']

export function typesOf (schema: Schema): string[] {
    if (Array.isArray(schema.type)) {
        return schema.type
    }
    return schema.type ? [schema.type] : []
}

// `string | null`, `array of string`, `oneOf (2)`
export function typeLabel (schema: Schema): string {
    if (!isObject(schema)) {
        return ''
    }
    if (Object.hasOwn(schema, 'const')) {
        return 'const'
    }
    const types = typesOf(schema)
    if (!types.length) {
        if (isObject(schema.properties)) {
            return 'object'
        }
        const combinator = COMBINATORS.find(keyword => Array.isArray(schema[keyword]))
        return combinator ? `${combinator} (${(schema[combinator] as unknown[]).length})` : 'any'
    }
    return types.map(type => {
        if (type === 'array' && isObject(schema.items) && schema.items.type) {
            return `array of ${typeLabel(schema.items)}`
        }
        return type
    }).join(' | ')
}
