import { expect } from 'vitest'

import { parseDotEnv } from '../../../../../../frontend/src/pages/admin/Template/utils.js'

describe('dotenv', () => {
    test('skips comments', () => {
        const env = parseDotEnv('a=b\n#comment\nb=c')
        expect(env).toEqual({ a: 'b', b: 'c' })
    })
    test('skips empty lines', () => {
        const env = parseDotEnv('a=b\n\nb=c')
        expect(env).toEqual({ a: 'b', b: 'c' })
    })
    test('skips lines without =', () => {
        const env = parseDotEnv('a=b\nb')
        expect(env).toEqual({ a: 'b' })
    })
    test('drops surrounding quotes', () => {
        const env = parseDotEnv('a="b"\nb=c')
        expect(env).toEqual({ a: 'b', b: 'c' })
    })
    test('keeps embedded quotes', () => {
        const env = parseDotEnv('a="b"\nb={"c":1,"d":"e"}\nf=don\'t drop the "quote"s')
        expect(env).toEqual({ a: 'b', b: '{"c":1,"d":"e"}', f: 'don\'t drop the "quote"s' })
    })
})
