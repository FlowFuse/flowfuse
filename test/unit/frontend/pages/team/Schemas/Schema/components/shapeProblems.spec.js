import { describe, expect, test } from 'vitest'

import { findShapeProblems } from '../../../../../../../../frontend/src/pages/team/Schemas/Schema/components/shapeProblems.ts'

const messages = (text) => findShapeProblems(text).map(problem => problem.message)

describe('findShapeProblems', () => {
    test('reports a root that is not an object', () => {
        expect(messages('[]')).toEqual(['The schema must be a JSON object'])
        expect(messages('"x"')).toEqual(['The schema must be a JSON object'])
        expect(messages('1')).toEqual(['The schema must be a JSON object'])
        expect(messages('  ')).toEqual(['The schema must be a JSON object'])
    })

    test('leaves syntax errors to the JSON language service', () => {
        expect(messages('{"type": "object",')).toEqual([])
    })

    test('reports numbers that would change when saved', () => {
        expect(messages('{"maximum": 1e400}')).toEqual(['This number is too large to store'])
        expect(messages('{"maximum": 12345678901234567890}')).toEqual(["This number can't be stored exactly, it would be saved as 12345678901234567000"])
    })

    test('accepts numbers that round trip', () => {
        expect(messages('{"minimum": -9007199254740991, "maximum": 9007199254740991, "multipleOf": 0.1, "exclusiveMaximum": 1e300}')).toEqual([])
    })

    test('points at the number inside nested subschemas', () => {
        const text = '{"properties": {"a": {"items": [{"maximum": 1e400}]}}}'
        const [problem] = findShapeProblems(text)
        expect(text.slice(problem.offset, problem.offset + problem.length)).toBe('1e400')
    })
})
