import { describe, expect, test } from 'vitest'

import { jsonLineDiff } from '../../../../frontend/src/utils/jsonLineDiff.ts'

// each line as its marker, as a diff prints it, and its text
const show = (from, to) => jsonLineDiff(from, to).map(line => `${{ added: '+', removed: '-', unchanged: ' ' }[line.type]} ${line.text}`)
const newerText = (from, to) => jsonLineDiff(from, to).filter(line => line.type !== 'removed').map(line => line.text).join('\n')
const olderText = (from, to) => jsonLineDiff(from, to).filter(line => line.type !== 'added').map(line => line.text).join('\n')
const withoutCommas = (text) => text.split('\n').map(line => line.replace(/,$/, '')).join('\n')

describe('jsonLineDiff', () => {
    test('gives every line as unchanged for two equal documents, numbered on both sides', () => {
        const lines = jsonLineDiff({ a: 1, b: [true] }, { a: 1, b: [true] })
        expect(lines.every(line => line.type === 'unchanged')).toBe(true)
        expect(lines.map(line => [line.oldNum, line.newNum])).toEqual([[1, 1], [2, 2], [3, 3], [4, 4], [5, 5], [6, 6]])
    })

    test('shows a changed value as its old line removed and its new line added, next to each other', () => {
        expect(show({ type: 'number', title: 'T' }, { type: 'integer', title: 'T' })).toEqual([
            '  {',
            '-   "type": "number",',
            '+   "type": "integer",',
            '    "title": "T"',
            '  }'
        ])
    })

    test('matches keys by name, so a key added in the middle does not disturb the ones around it', () => {
        expect(show({ a: { x: 1 }, c: 3 }, { a: { x: 1 }, b: 2, c: 3 })).toEqual([
            '  {',
            '    "a": {',
            '      "x": 1',
            '    },',
            '+   "b": 2,',
            '    "c": 3',
            '  }'
        ])
    })

    test('does not report a line as changed because a comma was added after it', () => {
        expect(show({ a: 1 }, { a: 1, b: 2 })).toEqual(['  {', '    "a": 1,', '+   "b": 2', '  }'])
    })

    test('shows a key that is gone where it was', () => {
        expect(show({ a: 1, gone: { deep: true }, z: 2 }, { a: 1, z: 2 })).toEqual([
            '  {',
            '    "a": 1,',
            '-   "gone": {',
            '-     "deep": true',
            '-   },',
            '    "z": 2',
            '  }'
        ])
    })

    test('shows a key that moved as removed where it was and added where it is', () => {
        expect(show({ a: 1, b: 2 }, { b: 2, a: 1 })).toEqual(['  {', '-   "a": 1,', '    "b": 2,', '+   "a": 1', '  }'])
    })

    test('compares the items of an array by position', () => {
        expect(show(['value'], ['value', 'unit'])).toEqual(['  [', '    "value",', '+   "unit"', '  ]'])
        expect(show([{ a: 1 }, 2], [{ a: 9 }])).toEqual(['  [', '    {', '-     "a": 1', '+     "a": 9', '    }', '-   2', '  ]'])
    })

    test('replaces a value whole when its kind changes or one side is empty', () => {
        expect(show({ a: { x: 1 } }, { a: [1] })).toEqual(['  {', '-   "a": {', '-     "x": 1', '-   }', '+   "a": [', '+     1', '+   ]', '  }'])
        expect(show({ a: {} }, { a: { x: 1 } })).toEqual(['  {', '-   "a": {}', '+   "a": {', '+     "x": 1', '+   }', '  }'])
    })

    test('reads as each document printed, whatever changed between them', () => {
        const from = { type: 'object', required: ['a', 'b'], properties: { a: { type: 'string' }, old: { enum: [1, 2] }, b: { items: [{ x: 1 }, { y: 2 }] } }, title: 'One' }
        const to = { title: 'Two', type: 'object', properties: { b: { items: [{ x: 2 }] }, a: { type: 'string', pattern: '^a' }, fresh: null }, required: ['a'] }
        expect(newerText(from, to)).toBe(JSON.stringify(to, null, 2))
        expect(withoutCommas(olderText(from, to))).toBe(withoutCommas(JSON.stringify(from, null, 2)))
        const lines = jsonLineDiff(from, to)
        expect(lines.filter(line => line.oldNum).map(line => line.oldNum)).toEqual(JSON.stringify(from, null, 2).split('\n').map((_, index) => index + 1))
        expect(lines.filter(line => line.newNum).map(line => line.newNum)).toEqual(JSON.stringify(to, null, 2).split('\n').map((_, index) => index + 1))
    })
})
