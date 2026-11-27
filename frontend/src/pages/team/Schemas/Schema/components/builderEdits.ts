import { RE2JS } from 're2js'

import { fieldsHolder, insertAfterPublished, otherFields, propertiesOf, schemaAt } from './builder'
import { escapePointer, pointerFor, unescapePointer } from './pointer'
import { type Schema, typesOf } from './schemaTypes'

export const FIELD_TYPES = ['string', 'number', 'integer', 'boolean', 'object', 'array', 'null'] as const
export const ITEM_TYPES = ['string', 'number', 'integer', 'boolean', 'object'] as const
export const STRING_FORMATS = ['date-time', 'date', 'time', 'email', 'uri', 'uuid', 'hostname', 'ipv4', 'ipv6']

// Changing a field's type drops the constraints the new type doesn't take
const CONSTRAINTS: Record<string, string[]> = {
    string: ['enum', 'minLength', 'maxLength', 'pattern', 'format'],
    number: ['enum', 'minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'multipleOf'],
    integer: ['enum', 'minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'multipleOf'],
    boolean: [],
    object: ['properties', 'required', 'additionalProperties', 'minProperties', 'maxProperties'],
    array: ['items', 'minItems', 'maxItems', 'uniqueItems'],
    null: []
}
const ALL_CONSTRAINTS = [...new Set(Object.values(CONSTRAINTS).flat())]

type LimitKey = 'minimum' | 'maximum' | 'minLength' | 'maxLength' | 'minItems' | 'maxItems'

// The pair of limits the panel shows for a type
interface Limits {
    min: LimitKey
    max: LimitKey
    whole: boolean
}
const NUMBER_LIMITS: Limits = { min: 'minimum', max: 'maximum', whole: false }
const LIMITS: Record<string, Limits> = {
    string: { min: 'minLength', max: 'maxLength', whole: true },
    number: NUMBER_LIMITS,
    integer: NUMBER_LIMITS,
    array: { min: 'minItems', max: 'maxItems', whole: true }
}

export interface FieldForm {
    name: string
    type: string
    nullable: boolean
    // '' for items that take any type
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
    otherFields: boolean
}

const numberText = (value: unknown) => typeof value === 'number' ? String(value) : ''

function parseNumber (text: string): number | undefined {
    if (text.trim() === '') {
        return undefined
    }
    return Number(text)
}

export function splitPointer (pointer: string): { holder: string, name: string } {
    const index = pointer.lastIndexOf('/properties/')
    return { holder: pointer.slice(0, index), name: unescapePointer(pointer.slice(index + '/properties/'.length)) }
}

// What the form shows as the type of a field that states none, and so takes any value
export const ANY_TYPE = 'any'

// The one type a field's form shows: the type it states apart from null, `object` for a field that lists fields
// without stating a type, and `any` for a field that states none
export function mainType (field: Schema): string {
    const types = typesOf(field)
    return types.find(type => type !== 'null') ?? types[0] ?? (field.properties ? 'object' : ANY_TYPE)
}

export function formFor (root: Schema, pointer: string): FieldForm {
    const field = schemaAt(root, pointer)!
    const { holder, name } = splitPointer(pointer)
    const types = typesOf(field)
    const main = mainType(field)
    const required = schemaAt(root, holder)!.required
    return {
        name,
        type: main,
        nullable: main !== 'null' && types.includes('null'),
        itemType: typesOf(field.items ?? {})[0] ?? '',
        required: Array.isArray(required) && required.includes(name),
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
        uniqueItems: !!field.uniqueItems,
        otherFields: otherFields(field) !== 'none'
    }
}

function limitsProblem (form: FieldForm, limits: Limits): string {
    for (const key of [limits.min, limits.max]) {
        const value = parseNumber(form[key])
        if (value === undefined) {
            continue
        }
        if (!Number.isFinite(value)) {
            return `${key} must be a number.`
        }
        if (limits.whole && !(Number.isInteger(value) && value >= 0)) {
            return `${key} must be a whole number of 0 or more.`
        }
    }
    const min = parseNumber(form[limits.min])
    const max = parseNumber(form[limits.max])
    if (min !== undefined && max !== undefined && min > max) {
        return `${limits.min} must not be more than ${limits.max}.`
    }
    return ''
}

// Whether a value typed into the allowed values is one a field of this type can have
const fitsType = (type: string, value: string) => type === 'number' ? Number.isFinite(Number(value)) : type === 'integer' ? Number.isInteger(Number(value)) : true

// The allowed values a field keeps when its type changes: the ones the new type can have
export function allowedValuesFor (type: string, values: string[]): string[] {
    return values.filter(value => fitsType(type, value))
}

function allowedValuesProblem (form: FieldForm): string {
    if (form.allowedValues.every(value => fitsType(form.type, value))) {
        return ''
    }
    return form.type === 'integer' ? 'Allowed values must be whole numbers.' : 'Allowed values must be numbers.'
}

function patternProblem (pattern: string): string {
    try {
        RE2JS.compile(pattern)
        return ''
    } catch {
        return 'The pattern is not a valid regular expression. Lookaround and backreferences are not supported.'
    }
}

// Why a field can't be saved as it is in the form, or '' when it can
export function formProblem (root: Schema, pointer: string, form: FieldForm): string {
    const name = form.name.trim()
    if (!name) {
        return 'A field needs a name.'
    }
    const { holder, name: current } = splitPointer(pointer)
    if (name !== current && Object.hasOwn(schemaAt(root, holder)!.properties ?? {}, name)) {
        return `There is already a field called ${name} here.`
    }
    const limits = LIMITS[form.type]
    const problem = (limits ? limitsProblem(form, limits) : '') || allowedValuesProblem(form)
    if (problem) {
        return problem
    }
    return form.type === 'string' && form.pattern ? patternProblem(form.pattern) : ''
}

// Only a change to the checkbox touches additionalProperties, so a schema there is kept
function setOtherFields (schema: Schema, allowed: boolean) {
    if (allowed === (otherFields(schema) !== 'none')) {
        return
    }
    if (allowed) {
        delete schema.additionalProperties
    } else {
        schema.additionalProperties = false
    }
}

/**
 * The root with one field changed as the form says, and the field's pointer after it.
 *
 * Only what was changed in the form is written. The form can't show all of a field (a type the schema doesn't state,
 * values of mixed types, keywords it has no input for), so writing back what it shows would change a field that was
 * only opened: applying a form that was not touched leaves the field exactly as it was.
 *
 * The field keeps its place among its siblings when renamed, the required list of the object holding it follows its
 * name and required flag, and a change of type drops the constraints the new type doesn't take.
 */
export function applyForm (root: Schema, pointer: string, form: FieldForm): { root: Schema, pointer: string } {
    const before = formFor(root, pointer)
    const next = structuredClone(root)
    const { holder: holderPointer, name: current } = splitPointer(pointer)
    const holder = schemaAt(next, holderPointer)!
    const field = holder.properties![current]
    const name = form.name.trim()
    const type = form.type
    const takes = CONSTRAINTS[type] ?? ALL_CONSTRAINTS
    const typeChanged = type !== before.type
    const nullableChanged = form.nullable !== before.nullable
    const changed = (key: keyof FieldForm) => typeChanged || JSON.stringify(form[key]) !== JSON.stringify(before[key])

    if (typeChanged) {
        for (const keyword of ALL_CONSTRAINTS) {
            if (!takes.includes(keyword)) {
                delete field[keyword]
            }
        }
        if (type === 'object' && !field.properties) {
            field.properties = {}
        }
    }
    if (typeChanged || nullableChanged) {
        if (type === ANY_TYPE) {
            delete field.type
        } else {
            field.type = form.nullable && type !== 'null' ? [type, 'null'] : type
        }
    }
    if (type === 'array' && form.itemType !== (typesOf(field.items ?? {})[0] ?? '')) {
        if (form.itemType) {
            field.items = { type: form.itemType }
        } else {
            delete field.items
        }
    }

    const set = (keyword: string, value: unknown) => {
        if (value === undefined || value === '') {
            delete field[keyword]
        } else {
            field[keyword] = value
        }
    }
    if (form.description.trim() !== before.description.trim()) {
        set('description', form.description.trim())
    }
    if (['string', 'number', 'integer'].includes(type) && (changed('allowedValues') || nullableChanged)) {
        const values: unknown[] = form.allowedValues.map(value => type === 'string' ? value : Number(value))
        if (values.length && form.nullable) {
            values.push(null)
        }
        set('enum', values.length ? values : undefined)
    }
    const limits = LIMITS[type]
    if (limits) {
        if (changed(limits.min)) set(limits.min, parseNumber(form[limits.min]))
        if (changed(limits.max)) set(limits.max, parseNumber(form[limits.max]))
    }
    if (type === 'string') {
        if (changed('pattern')) set('pattern', form.pattern)
        if (changed('format')) set('format', form.format)
    }
    if (type === 'array' && changed('uniqueItems')) {
        set('uniqueItems', form.uniqueItems || undefined)
    }
    if (type === 'object' && form.otherFields !== before.otherFields) {
        setOtherFields(field, form.otherFields)
    }

    if (name !== current) {
        holder.properties = Object.fromEntries(Object.entries(holder.properties!).map(([key, value]) => [key === current ? name : key, value]))
    }
    if (name !== current || form.required !== before.required) {
        const currentRequired = Array.isArray(holder.required) ? holder.required : []
        const required = currentRequired.filter(entry => entry !== current)
        if (form.required) {
            const position = currentRequired.indexOf(current)
            required.splice(position === -1 ? required.length : position, 0, name)
        }
        if (required.length) {
            holder.required = required
        } else {
            delete holder.required
        }
    }
    return { root: next, pointer: pointerFor(holderPointer, name) }
}

// The root with a new string field added to an object, named so it is unique there
export function addField (root: Schema, holderPointer: string): { root: Schema, pointer: string } {
    const next = structuredClone(root)
    const holder = schemaAt(next, holderPointer)!
    holder.properties = holder.properties ?? {}
    let name = 'new_field'
    for (let count = 2; Object.hasOwn(holder.properties, name); count++) {
        name = `new_field_${count}`
    }
    holder.properties[name] = { type: 'string' }
    return { root: next, pointer: pointerFor(holderPointer, name) }
}

export function removeField (root: Schema, pointer: string): Schema {
    const next = structuredClone(root)
    const { holder, name } = splitPointer(pointer)
    delete schemaAt(next, holder)!.properties![name]
    return next
}

export function setOtherFieldsAllowed (root: Schema, holderPointer: string, allowed: boolean): Schema {
    const next = structuredClone(root)
    setOtherFields(schemaAt(next, holderPointer)!, allowed)
    return next
}

export function moveField (root: Schema, pointer: string, offset: -1 | 1): Schema {
    const next = structuredClone(root)
    const { holder: holderPointer, name } = splitPointer(pointer)
    const holder = schemaAt(next, holderPointer)!
    const entries = Object.entries(propertiesOf(holder))
    const from = entries.findIndex(([key]) => key === name)
    const to = from + offset
    if (from === -1 || to < 0 || to >= entries.length) {
        return next
    }
    const [moved] = entries.splice(from, 1)
    entries.splice(to, 0, moved)
    holder.properties = Object.fromEntries(entries)
    return next
}

// Unlike removeField, the name also leaves the required list of its object
export function deleteField (root: Schema, pointer: string): Schema {
    const next = removeField(root, pointer)
    const { holder: holderPointer, name } = splitPointer(pointer)
    const holder = schemaAt(next, holderPointer)!
    const required = Array.isArray(holder.required) ? holder.required.filter(entry => entry !== name) : []
    if (required.length) {
        holder.required = required
    } else {
        delete holder.required
    }
    return next
}

// Escaped like the paths of the table rows
export function nestedPaths (root: Schema, pointer: string, path: string): string[] {
    const paths: string[] = []
    const visit = (schema: Schema, prefix: string) => {
        const holder = fieldsHolder(schema)
        for (const [name, child] of Object.entries(propertiesOf(holder?.schema ?? {}))) {
            const childPath = `${prefix}/${escapePointer(name)}`
            paths.push(childPath)
            visit(child, childPath)
        }
    }
    visit(schemaAt(root, pointer)!, path)
    return paths
}

// The root with a deleted field put back as the published version has it: among the fields still there, and on the required list when it was required there
export function restoreField (root: Schema, published: Schema, pointer: string): Schema {
    const next = structuredClone(root)
    const { holder: holderPointer, name } = splitPointer(pointer)
    const holder = schemaAt(next, holderPointer)!
    const before = schemaAt(published, holderPointer)!
    const publishedFields = propertiesOf(before)
    const fields = propertiesOf(holder)
    const restored = { ...fields, [name]: structuredClone(publishedFields[name]) }
    holder.properties = Object.fromEntries(insertAfterPublished(Object.keys(fields), name, Object.keys(publishedFields)).map(key => [key, restored[key]]))
    const publishedRequired = Array.isArray(before.required) ? before.required : []
    const required = Array.isArray(holder.required) ? holder.required : []
    if (publishedRequired.includes(name) && !required.includes(name)) {
        holder.required = insertAfterPublished(required, name, publishedRequired)
    }
    return next
}
