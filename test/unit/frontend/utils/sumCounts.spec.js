import { expect } from 'vitest'

import sumCounts from '../../../../frontend/src/utils/sumCounts.ts'

describe('sumCounts', () => {
    test('totals the values of a state-count map', () => {
        expect(sumCounts({ running: 3, error: 2, stopped: 1 })).toBe(6)
    })

    test('treats a missing or empty map as zero', () => {
        expect(sumCounts({})).toBe(0)
        expect(sumCounts(null)).toBe(0)
        expect(sumCounts(undefined)).toBe(0)
    })
})
