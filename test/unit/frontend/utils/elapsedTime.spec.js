import { expect } from 'vitest'
import elapsedTime from '../../../../frontend/src/utils/elapsedTime.js'

describe('elapsedTime', () => {
    test('reports the number of years, months, days between more than one day apart', () => {
        // month is 0 indexed
        expect(elapsedTime(new Date(Date.UTC(2021, 2, 4, 5, 6, 7)), new Date(Date.UTC(2020, 0, 1, 0, 0, 0)))).toBe('1 year, 2 months, 3 days')
        expect(elapsedTime(new Date(Date.UTC(2020, 2, 4, 5, 6, 7)), new Date(Date.UTC(2020, 0, 1, 0, 0, 0)))).toBe('2 months, 3 days')
        expect(elapsedTime(new Date(Date.UTC(2020, 0, 4, 5, 6, 7)), new Date(Date.UTC(2020, 0, 1, 0, 0, 0)))).toBe('3 days')
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
})
