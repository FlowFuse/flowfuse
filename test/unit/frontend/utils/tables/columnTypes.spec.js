import { describe, expect, test } from 'vitest'

import { getColumnTypeKind, getColumnTypeLabel } from '../../../../../frontend/src/utils/tables/columnTypes.ts'

describe('getColumnTypeLabel', () => {
    test.each([
        ['text', 'Text'],
        ['varchar', 'Text'],
        ['bpchar', 'Text'],
        ['int8', 'Big Number'],
        ['int4', 'Whole Number'],
        ['int2', 'Whole Number'],
        ['float4', 'Number'],
        ['float8', 'Number – Double Precision'],
        ['numeric', 'Decimal'],
        ['bool', 'True/False'],
        ['date', 'Date'],
        ['timestamp', 'Date & Time'],
        ['timestamptz', 'Date & Time with Timezone'],
        ['time', 'Time'],
        ['timetz', 'Time with Timezone'],
        ['interval', 'Duration'],
        ['json', 'JSON'],
        ['jsonb', 'JSON'],
        ['uuid', 'UUID'],
        ['bytea', 'Binary']
    ])('names %s as %s', (type, label) => {
        expect(getColumnTypeLabel(type)).toBe(label)
    })

    test('names an array after what it holds', () => {
        expect(getColumnTypeLabel('_text')).toBe('List of Text')
        expect(getColumnTypeLabel('_int4')).toBe('List of Whole Number')
    })

    test('keeps the database name for a type it has no name for', () => {
        expect(getColumnTypeLabel('tsvector')).toBe('tsvector')
        expect(getColumnTypeLabel('_macaddr')).toBe('List of macaddr')
    })

    test('copes with a column that reports no type', () => {
        expect(getColumnTypeLabel(undefined)).toBeUndefined()
    })
})

describe('getColumnTypeKind', () => {
    test.each([
        ['text', 'text'],
        ['varchar', 'text'],
        ['int8', 'number'],
        ['int2', 'number'],
        ['numeric', 'number'],
        ['float8', 'number'],
        ['bool', 'boolean'],
        ['date', 'date'],
        ['timestamp', 'timestamp'],
        ['timestamptz', 'timestamptz'],
        ['time', 'time'],
        ['json', 'json'],
        ['jsonb', 'json'],
        ['uuid', 'uuid'],
        ['bytea', 'binary'],
        ['_text', 'list'],
        ['_int4', 'list']
    ])('treats %s as %s', (type, kind) => {
        expect(getColumnTypeKind(type)).toBe(kind)
    })

    test('treats a type it does not know as text', () => {
        expect(getColumnTypeKind('money')).toBe('text')
        expect(getColumnTypeKind(undefined)).toBe('text')
    })
})
