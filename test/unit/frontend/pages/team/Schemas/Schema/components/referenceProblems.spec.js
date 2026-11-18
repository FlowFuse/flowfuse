import { describe, expect, test } from 'vitest'

import { findReferenceProblems } from '../../../../../../../../frontend/src/pages/team/Schemas/Schema/components/referenceProblems.ts'

const keywords = (doc) => findReferenceProblems(JSON.stringify(doc)).map(problem => problem.message.split(' ')[0])

describe('findReferenceProblems', () => {
    test('reports every reference keyword the backend rejects', () => {
        expect(keywords({
            $ref: '#',
            $dynamicRef: '#',
            $recursiveRef: '#',
            $defs: {},
            definitions: {},
            $anchor: 'a',
            $dynamicAnchor: 'a',
            $recursiveAnchor: true
        })).toEqual(['$ref', '$dynamicRef', '$recursiveRef', '$defs', 'definitions', '$anchor', '$dynamicAnchor', '$recursiveAnchor'])
    })

    test('allows a top level $id but reports a nested one', () => {
        expect(keywords({ $id: 'urn:x', properties: { a: { $id: 'urn:y' } } })).toEqual(['$id'])
    })

    test('finds references inside subschemas, lists and maps', () => {
        expect(keywords({
            items: { $ref: '#' },
            allOf: [{ $ref: '#' }],
            properties: { a: { $ref: '#' } }
        })).toEqual(['$ref', '$ref', '$ref'])
    })

    test('does not treat property names or data as references', () => {
        expect(keywords({
            properties: { definitions: { type: 'object' }, $ref: { type: 'string' } },
            default: { $ref: '#' },
            const: { definitions: 1 }
        })).toEqual([])
    })

    test('allows a top level $schema and walks if, then, else, patternProperties and dependentSchemas', () => {
        expect(keywords({
            $schema: 'https://json-schema.org/draft/2020-12/schema',
            if: { $ref: '#' },
            then: { $ref: '#' },
            else: { $ref: '#' },
            patternProperties: { '^a': { $ref: '#' } },
            dependentSchemas: { a: { $ref: '#' } }
        })).toEqual(['$ref', '$ref', '$ref', '$ref', '$ref'])
    })

    test('points at the key in the text', () => {
        const text = '{ "items": { "$ref": "#" } }'
        const [problem] = findReferenceProblems(text)
        expect(text.slice(problem.offset, problem.offset + problem.length)).toBe('"$ref"')
    })
})
