import { expect } from 'vitest'
import DateTime from '../../../../frontend/src/mixins/DateTime.js'

describe('DateTime', () => {
    test('that a UNIX timestamp is formatted correctly', () => {
        expect(DateTime.methods.formatDate(1652794780548)).toBe('17 May 2022')
    })
    test('that a non-UNIX timestamp is handled appropriately, and returns itself', () => {
        expect(DateTime.methods.formatDate('not a date')).toBe('not a date')
    })
})
