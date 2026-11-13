import { describe, expect, test } from 'vitest'

import { formatCellValue } from '../../../../../frontend/src/utils/tables/cellValues.ts'

// what the viewer's browser would print for a moment in time, read as UTC so nothing shifts
const inUtc = (iso, style) => new Intl.DateTimeFormat(undefined, { ...style, timeZone: 'UTC' }).format(new Date(iso))
const inLocalTime = iso => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'medium' }).format(new Date(iso))

describe('formatCellValue', () => {
    describe('empty values', () => {
        test.each(['text', 'int4', 'bool', 'timestamptz', 'jsonb', '_text'])('says empty for a %s column with no value', (type) => {
            expect(formatCellValue(null, type)).toEqual({ kind: 'empty', text: 'empty', original: null })
        })

        test('tells an empty piece of text apart from no value', () => {
            expect(formatCellValue('', 'text')).toEqual({ kind: 'text', text: '', original: '' })
        })
    })

    describe('text', () => {
        test('shows text as it is', () => {
            expect(formatCellValue('Routine reading', 'text')).toEqual({ kind: 'text', text: 'Routine reading', original: 'Routine reading' })
        })

        test('does not guess that text holding JSON is JSON', () => {
            expect(formatCellValue('{"a": 1}', 'text')).toMatchObject({ kind: 'text', text: '{"a": 1}' })
        })
    })

    describe('numbers', () => {
        test.each([
            ['int4', 1284, '1284'],
            ['int8', '9007199254740993', '9007199254740993'],
            ['numeric', '22.10', '22.10'],
            ['float8', 0.1, '0.1'],
            ['float4', 'NaN', 'NaN']
        ])('shows a %s exactly as stored', (type, value, text) => {
            expect(formatCellValue(value, type)).toMatchObject({ kind: 'number', text })
        })
    })

    describe('true and false', () => {
        test('shows them as words', () => {
            expect(formatCellValue(true, 'bool')).toMatchObject({ kind: 'boolean', text: 'true' })
            expect(formatCellValue(false, 'bool')).toMatchObject({ kind: 'boolean', text: 'false' })
        })
    })

    describe('dates and times', () => {
        test('shows a date in the browser format, on the day that is stored', () => {
            expect(formatCellValue('2025-08-01', 'date')).toEqual({
                kind: 'date',
                text: inUtc('2025-08-01T00:00:00Z', { dateStyle: 'medium' }),
                original: '2025-08-01'
            })
        })

        test('shows a date and time without a zone as stored, never shifted', () => {
            expect(formatCellValue('2025-08-01 23:20:05.290019', 'timestamp')).toMatchObject({
                kind: 'timestamp',
                text: inUtc('2025-08-01T23:20:05Z', { dateStyle: 'medium', timeStyle: 'medium' }),
                original: '2025-08-01 23:20:05.290019'
            })
        })

        test('shows a time as stored, never shifted', () => {
            expect(formatCellValue('23:20:05', 'time')).toMatchObject({
                kind: 'time',
                text: inUtc('1970-01-01T23:20:05Z', { timeStyle: 'medium' })
            })
        })

        test('shows a date and time with a zone in local time', () => {
            expect(formatCellValue('2025-08-01T11:20:05.290Z', 'timestamptz')).toEqual({
                kind: 'timestamptz',
                text: inLocalTime('2025-08-01T11:20:05.290Z'),
                original: '2025-08-01T11:20:05.290Z'
            })
        })

        test('keeps the year of a date in the first century', () => {
            expect(formatCellValue('0044-03-15', 'date').text).toBe(inUtc('0044-03-15T00:00:00Z', { dateStyle: 'medium' }))
        })

        test.each([
            ['date', 'infinity'],
            ['date', '0044-03-15 BC'],
            ['timestamp', '-infinity'],
            ['timestamptz', 'not a date'],
            ['time', '24:00:00+03']
        ])('shows a %s it cannot read (%s) as stored', (type, value) => {
            expect(formatCellValue(value, type).text).toBe(value)
        })

        test('leaves a time with a zone and a duration as stored', () => {
            expect(formatCellValue('11:20:05+03', 'timetz')).toMatchObject({ kind: 'text', text: '11:20:05+03' })
            expect(formatCellValue('2 days 03:00:00', 'interval')).toMatchObject({ kind: 'text', text: '2 days 03:00:00' })
        })
    })

    describe('JSON', () => {
        test('shows it on one line', () => {
            expect(formatCellValue({ sensor: 'temp', reading: 22.1 }, 'jsonb')).toMatchObject({ kind: 'json', text: '{"sensor":"temp","reading":22.1}' })
        })

        test('shows a JSON string, number or list as JSON', () => {
            expect(formatCellValue([1, 2], 'json').text).toBe('[1,2]')
            expect(formatCellValue(5, 'jsonb').text).toBe('5')
        })
    })

    describe('ids', () => {
        test('shows a uuid in full', () => {
            const uuid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
            expect(formatCellValue(uuid, 'uuid')).toMatchObject({ kind: 'uuid', text: uuid })
        })
    })

    describe('binary', () => {
        test('shows the size and the start of the content', () => {
            expect(formatCellValue({ bytes: 400, hex: 'deadbeef' }, 'bytea')).toMatchObject({ kind: 'binary', text: '400 bytes · deadbeef…' })
        })

        test('does not suggest there is more when the whole content is shown', () => {
            expect(formatCellValue({ bytes: 4, hex: 'deadbeef' }, 'bytea').text).toBe('4 bytes · deadbeef')
            expect(formatCellValue({ bytes: 1, hex: 'ff' }, 'bytea').text).toBe('1 byte · ff')
        })

        test('shows only the size of an empty value', () => {
            expect(formatCellValue({ bytes: 0, hex: '' }, 'bytea').text).toBe('0 bytes')
        })
    })

    describe('lists', () => {
        test('shows the items in a row', () => {
            expect(formatCellValue(['E12', 'E40'], '_text')).toMatchObject({ kind: 'list', text: '[E12, E40]' })
            expect(formatCellValue([1, null, 3], '_int4').text).toBe('[1, null, 3]')
            expect(formatCellValue([], '_text').text).toBe('[]')
        })

        test('shows lists inside lists', () => {
            expect(formatCellValue([[1, 2], [3, 4]], '_int4').text).toBe('[[1,2], [3,4]]')
        })
    })

    describe('anything else', () => {
        test('shows a type it has no rules for as stored', () => {
            expect(formatCellValue('$12.50', 'money')).toMatchObject({ kind: 'text', text: '$12.50' })
            expect(formatCellValue('(1,1)', 'point')).toMatchObject({ kind: 'text', text: '(1,1)' })
        })
    })

    describe('showing original values', () => {
        test.each([
            ['bool', true, 'true'],
            ['date', '2025-08-01', '2025-08-01'],
            ['timestamptz', '2025-08-01T11:20:05.290Z', '2025-08-01T11:20:05.290Z'],
            ['jsonb', { a: 1 }, '{"a":1}'],
            ['bytea', { bytes: 400, hex: 'deadbeef' }, '{"bytes":400,"hex":"deadbeef"}'],
            ['_text', ['E12', 'E40'], '["E12","E40"]']
        ])('shows a %s as plain text, as stored', (type, value, text) => {
            expect(formatCellValue(value, type, { original: true })).toEqual({ kind: 'text', text, original: text })
        })

        test('still says empty when there is no value', () => {
            expect(formatCellValue(null, 'date', { original: true })).toMatchObject({ kind: 'empty', text: 'empty' })
        })
    })
})
