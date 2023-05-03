import { expect } from 'vitest'
import elapsedTime from '../../../../frontend/src/utils/elapsedTime.js'

describe('elapsedTime', () => {
    test('reports the number of years, months, days between more than one day apart', () => {
        // month is 0 indexed
        expect(elapsedTime(new Date(Date.UTC(2021, 2, 4, 5, 6, 7)), new Date(Date.UTC(2020, 0, 1, 0, 0, 0)))).toBe('1 year, 2 months, 3 days')
        expect(elapsedTime(new Date(Date.UTC(2020, 2, 4, 5, 6, 7)), new Date(Date.UTC(2020, 0, 1, 0, 0, 0)))).toBe('2 months, 3 days')
        expect(elapsedTime(new Date(Date.UTC(2020, 0, 4, 5, 6, 7)), new Date(Date.UTC(2020, 0, 1, 0, 0, 0)))).toBe('3 days')
    })

    test('reports the number of weeks for periods longer than seven days', () => {
        // month is 0 indexed
        expect(elapsedTime(new Date(Date.UTC(2021, 2, 14, 5, 6, 7)), new Date(Date.UTC(2020, 0, 1, 0, 0, 0)))).toBe('1 year, 2 months, 1 week, 6 days')
        expect(elapsedTime(new Date(Date.UTC(2020, 2, 15, 5, 6, 7)), new Date(Date.UTC(2020, 0, 1, 0, 0, 0)))).toBe('2 months, 2 weeks')
        expect(elapsedTime(new Date(Date.UTC(2020, 0, 30, 5, 6, 7)), new Date(Date.UTC(2020, 0, 1, 0, 0, 0)))).toBe('4 weeks, 1 day')
    })

    test('reports the number of hours, minutes for periods less than one day apart', () => {
        expect(elapsedTime(new Date(Date.UTC(2020, 0, 1, 4, 5, 6)), new Date(Date.UTC(2020, 0, 1, 0, 0, 0)))).toBe('4 hours, 5 minutes')
        expect(elapsedTime(new Date(Date.UTC(2020, 0, 1, 23, 55, 6)), new Date(Date.UTC(2020, 0, 1, 0, 0, 0)))).toBe('23 hours, 55 minutes')
    })

    test('reports the number of minutes and seconds for periods less than one hour apart', () => {
        expect(elapsedTime(new Date(Date.UTC(2020, 0, 1, 0, 5, 6)), new Date(Date.UTC(2020, 0, 1, 0, 0, 0)))).toBe('5 minutes, 6 seconds')
        expect(elapsedTime(new Date(Date.UTC(2020, 0, 1, 0, 59, 59)), new Date(Date.UTC(2020, 0, 1, 0, 0, 0)))).toBe('59 minutes, 59 seconds')
    })

    test('reports the number seconds for periods less than one minute apart', () => {
        expect(elapsedTime(new Date(Date.UTC(2020, 0, 1, 0, 0, 6)), new Date(Date.UTC(2020, 0, 1, 0, 0, 0)))).toBe('6 seconds')
        expect(elapsedTime(new Date(Date.UTC(2020, 0, 1, 0, 0, 59)), new Date(Date.UTC(2020, 0, 1, 0, 0, 0)))).toBe('59 seconds')
    })

    test('reports moments for less than one second apart', () => {
        expect(elapsedTime(new Date(Date.UTC(2020, 0, 1, 0, 0, 0, 1)), new Date(Date.UTC(2020, 0, 1, 0, 0, 0)))).toBe('moments')
        expect(elapsedTime(new Date(Date.UTC(2020, 0, 1, 0, 0, 0, 999)), new Date(Date.UTC(2020, 0, 1, 0, 0, 0)))).toBe('moments')
    })

    test('converts ISO datetime strings with and without time zone to date time', () => {
        expect(elapsedTime('2023-01-01', '2023-01-01T05:30:00Z')).toBe('5 hours, 30 minutes') // Local timezone
        expect(elapsedTime('2023-01-01T00:00:00.000Z', '2023-01-01T05:30:00Z')).toBe('5 hours, 30 minutes') // UTC
        expect(elapsedTime('2023-01-01T00:00:00.000+05:00', '2023-01-01T05:30:00Z')).toBe('10 hours, 30 minutes') // EST
        expect(elapsedTime('2023-01-01T00:00:00.000+08:00', '2023-01-01T05:30:00Z')).toBe('13 hours, 30 minutes') // PST
    })

    test('converts epoch numbers or strings of numbers into datetime strings', () => {
        expect(elapsedTime(1672576200000, '2023-01-01T00:00:00Z')).toBe('12 hours, 30 minutes') // 2023-01-01 12:30 UTC
        expect(elapsedTime('1672576200000', '2023-01-01T00:00:00Z')).toBe('12 hours, 30 minutes') // 2023-01-01 12:30 UTC

        expect(elapsedTime('2023-01-01T00:00:00Z', 1672551000000)).toBe('5 hours, 30 minutes') // 2023-01-01 5:30 UTC
        expect(elapsedTime('2023-01-01T00:00:00Z', '1672551000000')).toBe('5 hours, 30 minutes') // 2023-01-01 5:30 UTC
    })

    test('compares relative to now if only a to date is passed', () => {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        tomorrow.setHours(tomorrow.getHours() + 1)

        expect(elapsedTime(tomorrow)).toBe('1 day')

        const soon = new Date()
        soon.setMinutes(soon.getMinutes() + 30)
        soon.setSeconds(soon.getSeconds() + 15)

        expect(elapsedTime(soon)).toBe('30 minutes, 15 seconds')
    })

    test('raises if invalid dates are passed', () => {
        expect(() => elapsedTime(null)).toThrowError('To date is required to be a valid ISO 8601 string, milliseconds since epoch or Date object')
        expect(() => elapsedTime('2023-13-01')).toThrowError('To date is required to be a valid ISO 8601 string, milliseconds since epoch or Date object')
        expect(() => elapsedTime(new Date('2023-13-01'))).toThrowError('To date is required to be a valid ISO 8601 string, milliseconds since epoch or Date object')

        expect(() => elapsedTime(new Date(), '2023-12-99')).toThrowError('From date is required to be a valid ISO 8601 string, milliseconds since epoch or Date object')
        expect(() => elapsedTime(new Date(), new Date('2023-12-99'))).toThrowError('From date is required to be a valid ISO 8601 string, milliseconds since epoch or Date object')
    })
})
