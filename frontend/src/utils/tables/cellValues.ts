import { type ColumnKind, getColumnTypeKind } from './columnTypes.ts'

// How a cell looks: the kind of value its column holds, or 'empty' when it has no value
export type CellKind = ColumnKind | 'empty'

export interface CellValue {
    kind: CellKind
    // the text to show
    text: string
    // the value as stored, null when there is none
    original: string | null
}

// A binary value as the table data API sends it: its size and the hex of its first bytes
interface BinaryValue {
    bytes: number
    hex: string
}

interface FormatOptions {
    // shows the value as stored
    original?: boolean
}

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/
const TIME = /^(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?$/
const TIMESTAMP = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})(?:\.\d+)?$/

// Values without a time zone are formatted as if they were UTC, so they are made readable
// without ever being shifted to another day or hour
const asStored: Intl.DateTimeFormatOptions = { timeZone: 'UTC' }
const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', ...asStored })
const timeFormat = new Intl.DateTimeFormat(undefined, { timeStyle: 'medium', ...asStored })
const timestampFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'medium', ...asStored })
// A value with a time zone is an exact moment, so it is shown in the viewer's local time
const localTimestampFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'medium' })

const utcDate = (year: number, month: number, day: number, hour = 0, minute = 0, second = 0): Date => {
    const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second))
    // Date.UTC reads years 0 to 99 as 1900 to 1999
    date.setUTCFullYear(year)
    return date
}

const listItem = (item: unknown): string => {
    if (item === null) return 'null'
    return typeof item === 'object' ? JSON.stringify(item) : String(item)
}

// Each formatter returns the text to show, or undefined when the value is not in the shape
// it expects (e.g. the date 'infinity'), in which case the value is shown as stored
const isBinaryValue = (value: unknown): value is BinaryValue => typeof (value as BinaryValue)?.bytes === 'number'

// the numbers a pattern picked out of a value, e.g. year, month and day
const parts = (match: RegExpExecArray): number[] => match.slice(1).map(Number)

const formatters: Partial<Record<ColumnKind, (value: unknown) => string | undefined>> = {
    boolean: value => typeof value === 'boolean' ? String(value) : undefined,
    date: value => {
        const match = DATE.exec(String(value))
        if (!match) return undefined
        const [year, month, day] = parts(match)
        return dateFormat.format(utcDate(year, month, day))
    },
    time: value => {
        const match = TIME.exec(String(value))
        if (!match) return undefined
        const [hour, minute, second] = parts(match)
        return timeFormat.format(utcDate(1970, 1, 1, hour, minute, second))
    },
    timestamp: value => {
        const match = TIMESTAMP.exec(String(value))
        if (!match) return undefined
        const [year, month, day, hour, minute, second] = parts(match)
        return timestampFormat.format(utcDate(year, month, day, hour, minute, second))
    },
    timestamptz: value => {
        if (typeof value !== 'string') return undefined
        const date = new Date(value)
        return Number.isNaN(date.getTime()) ? undefined : localTimestampFormat.format(date)
    },
    binary: value => {
        if (!isBinaryValue(value)) return undefined
        const size = `${value.bytes} ${value.bytes === 1 ? 'byte' : 'bytes'}`
        // only the start of the content is sent, so say when there is more of it
        const preview = value.hex.length / 2 < value.bytes ? `${value.hex}…` : value.hex
        return preview ? `${size} · ${preview}` : size
    },
    list: value => Array.isArray(value) ? `[${value.map(listItem).join(', ')}]` : undefined
}

/**
 * The value exactly as it is stored, as text
 * @param value - A value as the table data API returns it
 */
export function getOriginalCellText (value: unknown): string {
    return typeof value === 'object' ? JSON.stringify(value) : String(value)
}

/**
 * Works out how the data grid shows a value
 * @param value - A value as the table data API returns it
 * @param type - The column's type as Postgres reports it
 * @returns The kind of value (which decides how the cell looks), the text to show, and the value as stored
 */
export function formatCellValue (value: unknown, type: string, { original = false }: FormatOptions = {}): CellValue {
    if (value === null || value === undefined) {
        return { kind: 'empty', text: 'empty', original: null }
    }
    const originalText = getOriginalCellText(value)
    if (original) {
        return { kind: 'text', text: originalText, original: originalText }
    }
    const kind = getColumnTypeKind(type)
    const text = formatters[kind]?.(value) ?? originalText
    return { kind, text, original: originalText }
}
