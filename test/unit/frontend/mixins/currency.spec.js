import { expect } from 'vitest'
import Currency from '../../../../frontend/src/mixins/Currency.js'

// import FF_UTIL from 'flowforge-test-utils'
// const { default: Currency } = FF_UTIL.import('frontend/src/mixins/Currency.js')

describe('Currency', () => {
    test('that a number is converted correctly', () => {
        expect(Currency.methods.formatCurrency(1000)).toBe('$10.00')
    })
    test('that a non-numerical value returns itself', () => {
        expect(Currency.methods.formatCurrency('not a number')).toBe('not a number')
    })
})
