import { describe, expect, test } from 'vitest'

import { locateDraftProblems } from '../../../../../../../../frontend/src/pages/team/Schemas/Schema/components/draftProblems.ts'

const text = JSON.stringify({
    type: 'object',
    properties: {
        'a/b': { type: 'strin', minLenght: 2 },
        'c~d': { type: 'string' },
        list: { prefixItems: [{ type: 'x' }] }
    }
}, null, 2)
const slice = ({ offset, length }) => text.slice(offset, offset + length)
const locate = (path) => slice(locateDraftProblems(text, [{ path, message: 'problem' }])[0])

describe('locateDraftProblems', () => {
    test('marks the key a problem path points at, so unknown keywords are underlined', () => {
        expect(locate('/properties/a~1b/minLenght')).toBe('"minLenght"')
        expect(locate('/properties/a~1b/type')).toBe('"type"')
    })

    test('unescapes ~1 and ~0 in pointer segments', () => {
        expect(locate('/properties/c~0d')).toBe('"c~d"')
    })

    test('walks into arrays by index', () => {
        expect(locate('/properties/list/prefixItems/0/type')).toBe('"type"')
    })

    test('marks only the first character for the root or an unknown path', () => {
        expect(locate('')).toBe('{')
        expect(locate('/nope/deeper')).toBe('{')
    })

    test('keeps the backend message', () => {
        expect(locateDraftProblems(text, [{ path: '', message: 'does not compile' }])[0].message).toBe('does not compile')
    })
})
