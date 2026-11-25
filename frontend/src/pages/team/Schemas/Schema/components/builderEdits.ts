import { type FieldSchema, fieldsHolder, schemaAt, typesOf } from './builder'

export { schemaAt }

// The types a field can have in the builder, `null` being offered on its own and as "Also allow null"
export const FIELD_TYPES = ['string', 'number', 'integer', 'boolean', 'object', 'array', 'null'] as const
export const ITEM_TYPES = ['string', 'number', 'integer', 'boolean', 'object'] as const
export const STRING_FORMATS = ['date-time', 'date', 'time', 'email', 'uri', 'uuid', 'hostname', 'ipv4']

// The constraints each type takes. Changing a field's type drops the ones the new type doesn't take
const CONSTRAINTS: Record<string, string[]> = {
    string: ['enum', 'minLength', 'maxLength', 'pattern', 'format'],
    number: ['enum', 'minimum', 'maximum'],
    integer: ['enum', 'minimum', 'maximum'],
    boolean: [],
    object: ['properties', 'required', 'additionalProperties'],
    array: ['items', 'minItems', 'maxItems', 'uniqueItems'],
    null: []
}
const ALL_CONSTRAINTS = [...new Set(Object.values(CONSTRAINTS).flat()), 'exclusiveMinimum', 'exclusiveMaximum']

// What the edit panel changes on a field
export interface FieldForm {
    name: string
    type: string
    nullable: boolean
    itemType: string
    required: boolean
    description: string
    allowedValues: string[]
    minimum: string
    maximum: string
    minLength: string
    maxLength: string
    pattern: string
    format: string
    minItems: string
    maxItems: string
    uniqueItems: boolean
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))
const unescape = (segment: string) => segment.replace(/~1/g, '/').replace(/~0/g, '~')
const numberText = (value: unknown) => typeof value === 'number' ? String(value) : ''

// The object schema holding a field, and the field's name in it
export function splitPointer (pointer: string): { holder: string, name: string } {
    const index = pointer.lastIndexOf('/properties/')
    return { holder: pointer.slice(0, index), name: unescape(pointer.slice(index + '/properties/'.length)) }
}

export function formFor (root: FieldSchema, pointer: string): FieldForm {
    const field = schemaAt(root, pointer)
    const { holder, name } = splitPointer(pointer)
    const types = typesOf(field)
    const main = types.find(type => type !== 'null') ?? types[0] ?? 'string'
    return {
        name,
        type: main,
        nullable: main !== 'null' && types.includes('null'),
        itemType: typesOf(field.items ?? {})[0] ?? 'string',
        required: (schemaAt(root, holder).required ?? []).includes(name),
        description: field.description ?? '',
        allowedValues: Array.isArray(field.enum) ? field.enum.filter(value => value !== null).map(String) : [],
        minimum: numberText(field.minimum),
        maximum: numberText(field.maximum),
        minLength: numberText(field.minLength),
        maxLength: numberText(field.maxLength),
        pattern: field.pattern ?? '',
        format: field.format ?? '',
        minItems: numberText(field.minItems),
        maxItems: numberText(field.maxItems),
        uniqueItems: !!field.uniqueItems
    }
}

// Why a field can't be saved as it is in the form, or '' when it can
export function formProblem (root: FieldSchema, pointer: string, form: FieldForm): string {
    const name = form.name.trim()
    if (!name) return 'A field needs a name.'
    const { holder, name: current } = splitPointer(pointer)
    if (name !== current && Object.hasOwn(schemaAt(root, holder).properties ?? {}, name)) return `There is already a field called ${name} here.`
    const numbers = ['minimum', 'maximum', 'minLength', 'maxLength', 'minItems', 'maxItems'] as const
    for (const key of numbers) {
        if (form[key].trim() && !Number.isFinite(Number(form[key]))) return `${key} must be a number.`
    }
    for (const key of ['minLength', 'maxLength', 'minItems', 'maxItems'] as const) {
        if (form[key].trim() && !(Number.isInteger(Number(form[key])) && Number(form[key]) >= 0)) return `${key} must be a whole number of 0 or more.`
    }
    if (form.pattern) {
        try {
            RegExp(form.pattern)
        } catch {
            return 'The pattern is not a valid regular expression.'
        }
    }
    return ''
}

function allowedValue (text: string, type: string): unknown {
    if ((type === 'number' || type === 'integer') && text.trim() !== '' && Number.isFinite(Number(text))) return Number(text)
    return text
}

/**
 * The root with one field changed as the form says. The field keeps its place among its siblings when renamed,
 * the required list of the object holding it follows its name and required flag, and keywords the form doesn't
 * cover are kept, apart from constraints the field's new type doesn't take.
 */
export function applyForm (root: FieldSchema, pointer: string, form: FieldForm): FieldSchema {
    const next = clone(root)
    const { holder: holderPointer, name: current } = splitPointer(pointer)
    const holder = schemaAt(next, holderPointer)
    const field: FieldSchema = holder.properties![current]
    const name = form.name.trim()

    const type = form.type
    if (type !== typesOf(field).find(candidate => candidate !== 'null')) {
        for (const keyword of ALL_CONSTRAINTS) {
            if (!CONSTRAINTS[type].includes(keyword)) delete field[keyword]
        }
    }
    field.type = form.nullable && type !== 'null' ? [type, 'null'] : type
    if (type === 'array' && typesOf(field.items ?? {})[0] !== form.itemType) field.items = { type: form.itemType }
    if (type === 'object' && !field.properties) field.properties = {}

    const set = (keyword: string, value: unknown) => {
        if (value === undefined || value === '') delete field[keyword]
        else field[keyword] = value
    }
    const number = (text: string) => text.trim() === '' ? undefined : Number(text)
    set('description', form.description.trim())
    if (CONSTRAINTS[type].includes('enum')) set('enum', form.allowedValues.length ? form.allowedValues.map(value => allowedValue(value, type)) : undefined)
    if (CONSTRAINTS[type].includes('minimum')) {
        set('minimum', number(form.minimum))
        set('maximum', number(form.maximum))
    }
    if (type === 'string') {
        set('minLength', number(form.minLength))
        set('maxLength', number(form.maxLength))
        set('pattern', form.pattern)
        set('format', form.format)
    }
    if (type === 'array') {
        set('minItems', number(form.minItems))
        set('maxItems', number(form.maxItems))
        set('uniqueItems', form.uniqueItems || undefined)
    }

    if (name !== current) {
        holder.properties = Object.fromEntries(Object.entries(holder.properties!).map(([key, value]) => [key === current ? name : key, value]))
    }
    const required = (holder.required ?? []).filter(entry => entry !== current)
    if (form.required) {
        const position = (holder.required ?? []).indexOf(current)
        required.splice(position === -1 ? required.length : position, 0, name)
    }
    if (required.length) holder.required = required
    else delete holder.required
    return next
}

// The root with a new string field added to an object, named so it is unique there. Gives the new field's pointer too
export function addField (root: FieldSchema, holderPointer: string): { root: FieldSchema, pointer: string } {
    const next = clone(root)
    const holder = schemaAt(next, holderPointer)
    holder.properties = holder.properties ?? {}
    let name = 'new_field'
    for (let count = 2; Object.hasOwn(holder.properties, name); count++) name = `new_field_${count}`
    holder.properties[name] = { type: 'string' }
    return { root: next, pointer: `${holderPointer}/properties/${name.replace(/~/g, '~0').replace(/\//g, '~1')}` }
}

// The root with an object allowing fields it doesn't list, which is the default, or not
export function setOtherFieldsAllowed (root: FieldSchema, holderPointer: string, allowed: boolean): FieldSchema {
    const next = clone(root)
    const holder = schemaAt(next, holderPointer)
    if (allowed) delete holder.additionalProperties
    else holder.additionalProperties = false
    return next
}

// The root with a field moved one place up (-1) or down (1) among the fields of its object
export function moveField (root: FieldSchema, pointer: string, offset: -1 | 1): FieldSchema {
    const next = clone(root)
    const { holder: holderPointer, name } = splitPointer(pointer)
    const holder = schemaAt(next, holderPointer)
    const entries = Object.entries(holder.properties ?? {})
    const from = entries.findIndex(([key]) => key === name)
    const to = from + offset
    if (from === -1 || to < 0 || to >= entries.length) return next
    const [moved] = entries.splice(from, 1)
    entries.splice(to, 0, moved)
    holder.properties = Object.fromEntries(entries)
    return next
}

// The root without a field, which also leaves the required list of its object
export function deleteField (root: FieldSchema, pointer: string): FieldSchema {
    const next = clone(root)
    const { holder: holderPointer, name } = splitPointer(pointer)
    const holder = schemaAt(next, holderPointer)
    delete holder.properties![name]
    const required = (holder.required ?? []).filter(entry => entry !== name)
    if (required.length) holder.required = required
    else delete holder.required
    return next
}

// The message paths of every field inside a field, at any depth, for saying what deleting it takes with it
export function nestedPaths (root: FieldSchema, pointer: string, path: string): string[] {
    const paths: string[] = []
    const visit = (schema: FieldSchema, prefix: string) => {
        const holder = fieldsHolder(schema)
        for (const [name, child] of Object.entries(holder?.schema.properties ?? {})) {
            const childPath = `${prefix}/${name}`
            paths.push(childPath)
            visit(child, childPath)
        }
    }
    visit(schemaAt(root, pointer), path)
    return paths
}
