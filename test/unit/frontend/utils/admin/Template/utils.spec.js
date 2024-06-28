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
    test('parses multiline values', () => {
        const envData = `BASIC=basic

# prev line deliberately blank
AFTER_BLANK=after_blank
EMPTY=
SINGLE_QUOTES='single_line_single_line'
SINGLE_QUOTES_SPACED='    single quotes single line untrimmed    '
DOUBLE_QUOTES="double_quotes_single_line"
DOUBLE_QUOTES_SPACED="    double quotes single line untrimmed    "
NEWLINES_QUOTED="expand\nnew\nlines"
NEWLINES_SINGLED_QUOTED='expand\nnew\nlines'
DONT_EXPAND=dont\\nexpand\\nescpated\\nnewlines 
# COMMENTS=excludes comment that looks like a key-value pair
EQUAL_SIGNS=handles_equals=sign
JSON_UNQUOTED={"foo": "bar"}
JSON_QUOTED='{"foo": "bar"}'
JSON_MULTILINE='{
  "foo": "bar"
}'
TRIM_SPACE_FROM_UNQUOTED=    some spaced out string
USERNAME=therealnerdybeast@example.tld
    SPACED_KEY = should be trimmed

MULTI_DOUBLE_QUOTED="THIS IS A
MULTILINE
STRING"

MULTI_SINGLE_QUOTED='THIS IS A
MULTILINE
STRING'

MULTI_WITH_BLANK_AND_COMMENT="SHOULD
KEEP EMPTY

AND KEEP LINE STARTING WITH #
# a line starting with a hash
WHEN IT IS QUOTED"`
        const env = parseDotEnv(envData)
        expect(env).toEqual({
            BASIC: 'basic',
            AFTER_BLANK: 'after_blank',
            EMPTY: '',
            SINGLE_QUOTES: 'single_line_single_line',
            SINGLE_QUOTES_SPACED: '    single quotes single line untrimmed    ',
            DOUBLE_QUOTES: 'double_quotes_single_line',
            DOUBLE_QUOTES_SPACED: '    double quotes single line untrimmed    ',
            NEWLINES_QUOTED: 'expand\nnew\nlines',
            NEWLINES_SINGLED_QUOTED: 'expand\nnew\nlines',
            DONT_EXPAND: 'dont\\nexpand\\nescpated\\nnewlines',
            EQUAL_SIGNS: 'handles_equals=sign',
            JSON_UNQUOTED: '{"foo": "bar"}',
            JSON_QUOTED: '{"foo": "bar"}',
            JSON_MULTILINE: '{\n  "foo": "bar"\n}',
            TRIM_SPACE_FROM_UNQUOTED: 'some spaced out string',
            USERNAME: 'therealnerdybeast@example.tld',
            SPACED_KEY: 'should be trimmed',
            MULTI_DOUBLE_QUOTED: 'THIS IS A\nMULTILINE\nSTRING',
            MULTI_SINGLE_QUOTED: 'THIS IS A\nMULTILINE\nSTRING',
            MULTI_WITH_BLANK_AND_COMMENT: 'SHOULD\n' +
                'KEEP EMPTY\n' +
                '\n' +
                'AND KEEP LINE STARTING WITH #\n' +
                '# a line starting with a hash\n' +
                'WHEN IT IS QUOTED'
        })
    })
})
