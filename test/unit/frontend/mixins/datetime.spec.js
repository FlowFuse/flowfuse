import { expect } from 'vitest'
import DateTime from '../../../../frontend/src/mixins/DateTime.js'

describe('DateTime', () => {
    describe('#formatDateTime', () => {
        test('that a UNIX timestamp is formatted correctly', () => {
            expect(DateTime.methods.formatDateTime(1652794780548, 'en-US')).toBe('May 17, 2022 at 3:39 PM')
        })
        test('that a UNIX timestamp is formatted correctly, with an alternative locale', () => {
            expect(DateTime.methods.formatDateTime(1652794780548, 'en-GB')).toBe('17 May 2022 at 15:39')
        })
    })

    describe('#formatDate', () => {
        test('that a UNIX timestamp is formatted correctly', () => {
            expect(DateTime.methods.formatDate(1652794780548, 'en-US')).toBe('May 17, 2022')
        })
        test('that a UNIX timestamp is formatted correctly, with an alternative locale', () => {
            expect(DateTime.methods.formatDate(1652794780548, 'en-GB')).toBe('17 May 2022')
        })
        test('that a non-UNIX timestamp is handled appropriately, and returns itself', () => {
            expect(DateTime.methods.formatDate('not a date')).toBe('not a date')
        })
    })

    describe('#formatTime', () => {
        test('that a UNIX timestamp is formatted correctly', () => {
            expect(DateTime.methods.formatTime(1652794780548, 'en-US')).toBe('3:39 PM')
        })
        test('that a UNIX timestamp is formatted correctly, with an alternative locale', () => {
            expect(DateTime.methods.formatTime(1652794780548, 'en-GB')).toBe('15:39')
        })
    })
})
