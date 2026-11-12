/**
 * What the Tables pages know about each column type, keyed by the type name Postgres
 * reports for a column (its udt_name): its friendly name, and the kind of value it holds,
 * which decides how the data grid shows it. This is the one place that lives, so a column
 * is called and treated the same in the data grid, the table schema and the create table form.
 */
export type ColumnKind = 'text' | 'number' | 'boolean' | 'date' | 'time' | 'timestamp' | 'timestamptz' | 'json' | 'uuid' | 'binary' | 'list'

const columnTypes: Record<string, { label: string, kind: ColumnKind }> = {
    text: { label: 'Text', kind: 'text' },
    varchar: { label: 'Text', kind: 'text' },
    bpchar: { label: 'Text', kind: 'text' },
    int8: { label: 'Big Number', kind: 'number' },
    int4: { label: 'Whole Number', kind: 'number' },
    int2: { label: 'Whole Number', kind: 'number' },
    float4: { label: 'Number', kind: 'number' },
    float8: { label: 'Number – Double Precision', kind: 'number' },
    numeric: { label: 'Decimal', kind: 'number' },
    bool: { label: 'True/False', kind: 'boolean' },
    date: { label: 'Date', kind: 'date' },
    timestamp: { label: 'Date & Time', kind: 'timestamp' },
    timestamptz: { label: 'Date & Time with Timezone', kind: 'timestamptz' },
    time: { label: 'Time', kind: 'time' },
    timetz: { label: 'Time with Timezone', kind: 'text' },
    interval: { label: 'Duration', kind: 'text' },
    json: { label: 'JSON', kind: 'json' },
    jsonb: { label: 'JSON', kind: 'json' },
    uuid: { label: 'UUID', kind: 'uuid' },
    bytea: { label: 'Binary', kind: 'binary' }
}

// Postgres names an array type after its element type, with a leading underscore
const isList = (type: string): boolean => !!type?.startsWith('_')

/**
 * @param type - The column's type as Postgres reports it, e.g. 'int8' or '_text'
 * @returns The friendly name, or the type itself when it has none
 */
export function getColumnTypeLabel (type: string): string {
    if (isList(type)) {
        return `List of ${getColumnTypeLabel(type.slice(1))}`
    }
    return columnTypes[type]?.label ?? type
}

/**
 * @param type - The column's type as Postgres reports it, e.g. 'int8' or '_text'
 * @returns The kind of value the column holds, 'text' when the type is not a known one
 */
export function getColumnTypeKind (type: string): ColumnKind {
    return isList(type) ? 'list' : columnTypes[type]?.kind ?? 'text'
}
