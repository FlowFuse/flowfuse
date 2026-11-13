/**
 * The friendly name of each column type, keyed by the type name Postgres reports for a
 * column (its udt_name). This is the one place those names live, so a column is called
 * the same thing in the data grid, the table schema and the create table form.
 */
const columnTypeLabels: Record<string, string> = {
    text: 'Text',
    varchar: 'Text',
    bpchar: 'Text',
    int8: 'Big Number',
    int4: 'Whole Number',
    int2: 'Whole Number',
    float4: 'Number',
    float8: 'Number – Double Precision',
    numeric: 'Decimal',
    bool: 'True/False',
    date: 'Date',
    timestamp: 'Date & Time',
    timestamptz: 'Date & Time with Timezone',
    time: 'Time',
    timetz: 'Time with Timezone',
    interval: 'Duration',
    json: 'JSON',
    jsonb: 'JSON',
    uuid: 'UUID',
    bytea: 'Binary'
}

/**
 * @param type - The column's type as Postgres reports it, e.g. 'int8' or '_text'
 * @returns The friendly name, or the type itself when it has none
 */
export function getColumnTypeLabel (type: string): string {
    // Postgres names an array type after its element type, with a leading underscore
    if (type?.startsWith('_')) {
        return `List of ${getColumnTypeLabel(type.slice(1))}`
    }
    return columnTypeLabels[type] ?? type
}
