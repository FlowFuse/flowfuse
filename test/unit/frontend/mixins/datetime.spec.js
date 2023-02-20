import { expect } from 'vitest'
import DateTime from '../../../../frontend/src/mixins/DateTime.js'

describe('DateTime', () => {
    // Some test envs seem to use non-breaking spaces in the time-format
    function normalizeWhiteSpace (str) {
        return str.replace(/\s/g, ' ')
    }

    describe('#formatDateTime', () => {
        // Timezone needs to be set to tests can run anywhere
        test('that a UNIX timestamp is formatted correctly', () => {
            expect(normalizeWhiteSpace(DateTime.methods.formatDateTime(1652794780548, 'en-US', { timeZone: 'Etc/UTC' }))).toEqual('May 17, 2022 at 1:39 PM')
        })
        test('that a UNIX timestamp is formatted correctly, with an alternative locale', () => {
            expect(DateTime.methods.formatDateTime(1652794780548, 'en-GB', { timeZone: 'Etc/UTC' })).toEqual('17 May 2022 at 13:39')
        })
    })

    describe('#formatDate', () => {
        test('that a UNIX timestamp is formatted correctly', () => {
            expect(DateTime.methods.formatDate(1652794780548, 'en-US')).toEqual('May 17, 2022')
        })
        test('that a UNIX timestamp is formatted correctly, with an alternative locale', () => {
            expect(DateTime.methods.formatDate(1652794780548, 'en-GB')).toEqual('17 May 2022')
        })
        test('that a non-UNIX timestamp is handled appropriately, and returns itself', () => {
            expect(DateTime.methods.formatDate('not a date')).toEqual('not a date')
        })
    })

    describe('#formatTime', () => {
        // Timezone needs to be set to tests can run anywhere
        test('that a UNIX timestamp is formatted correctly', () => {
            expect(normalizeWhiteSpace(DateTime.methods.formatTime(1652794780548, 'en-US', { timeZone: 'Etc/UTC' }))).toEqual('1:39 PM')
        })
        test('that a UNIX timestamp is formatted correctly, with an alternative locale', () => {
            expect(DateTime.methods.formatTime(1652794780548, 'en-GB', { timeZone: 'Etc/UTC' })).toEqual('13:39')
        })
    })
})
