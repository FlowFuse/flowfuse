const should = require('should')

const { assertStringKey, assertStringPattern, escapeGlob, globToRegExp } = require('../../../../forge/caches/util.js')

describe('Cache util', function () {
    describe('globToRegExp', function () {
        const match = (pattern, str) => globToRegExp(pattern).test(str)

        describe('literal patterns', function () {
            it('matches an exact string', function () {
                match('abc', 'abc').should.be.true()
            })

            it('does not match a different string', function () {
                match('abc', 'abd').should.be.false()
            })

            it('is anchored at both ends', function () {
                match('bc', 'abc').should.be.false()
                match('ab', 'abc').should.be.false()
                match('abc', 'xabcx').should.be.false()
            })

            it('is case sensitive', function () {
                match('abc', 'ABC').should.be.false()
                match('ABC', 'ABC').should.be.true()
            })

            it('empty pattern matches only the empty string', function () {
                match('', '').should.be.true()
                match('', 'a').should.be.false()
            })

            it('matches keys containing common separators', function () {
                match('response:aaa-bbb_ccc/ddd', 'response:aaa-bbb_ccc/ddd').should.be.true()
            })
        })

        describe('regex special characters are literals', function () {
            it('treats . as a literal', function () {
                match('a.c', 'a.c').should.be.true()
                match('a.c', 'abc').should.be.false()
            })

            it('treats + as a literal', function () {
                match('a+b', 'a+b').should.be.true()
                match('a+b', 'aab').should.be.false()
                match('a+b', 'ab').should.be.false()
            })

            it('treats | as a literal', function () {
                match('a|b', 'a|b').should.be.true()
                match('a|b', 'a').should.be.false()
                match('a|b', 'b').should.be.false()
            })

            it('treats parentheses as literals', function () {
                match('(ab)', '(ab)').should.be.true()
                match('(ab)', 'ab').should.be.false()
            })

            it('treats braces as literals', function () {
                match('a{1}', 'a{1}').should.be.true()
                match('a{1}', 'a').should.be.false()
            })

            it('treats ^ and $ as literals outside a character class', function () {
                match('a^b', 'a^b').should.be.true()
                match('a$b', 'a$b').should.be.true()
                match('a$', 'a$').should.be.true()
                match('a$', 'a').should.be.false()
            })

            it('a pattern of regex metacharacters does not act as regex', function () {
                match('.*', 'abc').should.be.false()
                match('.*', '.x').should.be.true()
                match('.+', '.+').should.be.true()
                match('.+', 'aa').should.be.false()
            })
        })

        describe('* wildcard', function () {
            it('matches any sequence including empty', function () {
                match('a*c', 'ac').should.be.true()
                match('a*c', 'abc').should.be.true()
                match('a*c', 'abbbbc').should.be.true()
                match('a*c', 'abd').should.be.false()
            })

            it('matches as a prefix pattern', function () {
                match('response:*', 'response:').should.be.true()
                match('response:*', 'response:aaa').should.be.true()
                match('response:*', 'state:aaa').should.be.false()
            })

            it('matches as a suffix pattern', function () {
                match('*:aaa', 'response:aaa').should.be.true()
                match('*:aaa', 'response:bbb').should.be.false()
            })

            it('bare * matches everything', function () {
                match('*', '').should.be.true()
                match('*', 'anything at all').should.be.true()
            })

            it('supports multiple wildcards', function () {
                match('*a*', 'xxaxx').should.be.true()
                match('*a*', 'xxx').should.be.false()
                match('a*b*c', 'a1b2c').should.be.true()
                match('a*b*c', 'a1c2b').should.be.false()
            })

            it('consecutive * behave as one', function () {
                match('a**c', 'abc').should.be.true()
                match('a**c', 'ac').should.be.true()
            })

            it('matches across newlines', function () {
                match('a*c', 'a\nc').should.be.true()
                match('*', 'a\nb').should.be.true()
            })
        })

        describe('? wildcard', function () {
            it('matches exactly one character', function () {
                match('a?c', 'abc').should.be.true()
                match('a?c', 'a.c').should.be.true()
                match('a?c', 'ac').should.be.false()
                match('a?c', 'abbc').should.be.false()
            })

            it('multiple ? require that exact length', function () {
                match('???', 'abc').should.be.true()
                match('???', 'ab').should.be.false()
                match('???', 'abcd').should.be.false()
            })

            it('matches a newline character', function () {
                match('a?c', 'a\nc').should.be.true()
            })
        })

        describe('character classes', function () {
            it('matches one character from the set', function () {
                match('[abc]', 'a').should.be.true()
                match('[abc]', 'b').should.be.true()
                match('[abc]', 'd').should.be.false()
                match('[abc]', 'ab').should.be.false()
            })

            it('supports ranges', function () {
                match('[a-c]x', 'bx').should.be.true()
                match('[a-c]x', 'dx').should.be.false()
                match('key[0-9]', 'key5').should.be.true()
                match('key[0-9]', 'keyx').should.be.false()
            })

            it('supports negation with ^', function () {
                match('[^a]x', 'bx').should.be.true()
                match('[^a]x', 'ax').should.be.false()
            })

            it('combines with other glob syntax', function () {
                match('response:[ab]*', 'response:aaa').should.be.true()
                match('response:[ab]*', 'response:bxx').should.be.true()
                match('response:[ab]*', 'response:cxx').should.be.false()
                match('device:[0-9]?:state', 'device:1a:state').should.be.true()
                match('device:[0-9]?:state', 'device:xa:state').should.be.false()
            })

            it('an unterminated [ is a literal', function () {
                match('a[bc', 'a[bc').should.be.true()
                match('a[bc', 'ab').should.be.false()
            })

            it('[] does not form an empty class', function () {
                match('[]a', '[]a').should.be.true()
                match('[]a', 'a').should.be.false()
            })

            it('a ] after a class is a literal', function () {
                match('[a]]', 'a]').should.be.true()
                match('[a]]', 'a').should.be.false()
            })
        })

        describe('escaping', function () {
            it('\\* is a literal *', function () {
                match('a\\*c', 'a*c').should.be.true()
                match('a\\*c', 'abc').should.be.false()
                match('a\\*c', 'abbc').should.be.false()
            })

            it('\\? is a literal ?', function () {
                match('a\\?c', 'a?c').should.be.true()
                match('a\\?c', 'abc').should.be.false()
            })

            it('\\[ is a literal [', function () {
                match('a\\[b]', 'a[b]').should.be.true()
                match('a\\[b]', 'ab').should.be.false()
            })

            it('\\\\ is a literal backslash', function () {
                match('a\\\\c', 'a\\c').should.be.true()
                match('a\\\\c', 'ac').should.be.false()
            })

            it('an escaped ordinary character is itself', function () {
                match('\\a\\b', 'ab').should.be.true()
                match('\\a\\b', 'xb').should.be.false()
            })

            it('a trailing lone backslash is a literal backslash', function () {
                match('a\\', 'a\\').should.be.true()
                match('a\\', 'a').should.be.false()
            })
        })

        describe('realistic cache key patterns', function () {
            it('correlation id lookups', function () {
                match('response:*', 'response:0aa4f1a2-8e7d-4c3b-9f6e-1234567890ab').should.be.true()
                match('response:*', 'errorCount').should.be.false()
            })

            it('scoped keys', function () {
                match('team:*:device:*', 'team:t1:device:d9').should.be.true()
                match('team:*:device:*', 'team:t1:instance:i2').should.be.false()
            })
        })
    })

    describe('escapeGlob', function () {
        it('escapes each glob special character', function () {
            escapeGlob('*').should.equal('\\*')
            escapeGlob('?').should.equal('\\?')
            escapeGlob('[').should.equal('\\[')
            escapeGlob(']').should.equal('\\]')
            escapeGlob('\\').should.equal('\\\\')
            escapeGlob('a*b?c[d]e\\f').should.equal('a\\*b\\?c\\[d\\]e\\\\f')
        })

        it('leaves plain values untouched', function () {
            escapeGlob('response:aaa-bbb_ccc/ddd.eee').should.equal('response:aaa-bbb_ccc/ddd.eee')
            escapeGlob('').should.equal('')
        })

        it('an escaped value matches only itself', function () {
            const match = (pattern, str) => globToRegExp(pattern).test(str)
            for (const value of ['a*b', 'a?b', 'a[bc]d', 'a\\b', '*', '[^x]', 'plain']) {
                match(escapeGlob(value), value).should.be.true()
            }
            match(escapeGlob('a*b'), 'axxb').should.be.false()
            match(escapeGlob('a?b'), 'axb').should.be.false()
            match(escapeGlob('[ab]'), 'a').should.be.false()
        })

        it('composes safely inside a larger pattern', function () {
            const match = (pattern, str) => globToRegExp(pattern).test(str)
            const pattern = `b2m::${escapeGlob('user*1')}:${escapeGlob('tab?[2]')}:*`
            match(pattern, 'b2m::user*1:tab?[2]:mcp-abc').should.be.true()
            match(pattern, 'b2m::userX1:tabY[2]:mcp-abc').should.be.false()
        })

        it('throws a TypeError for non-strings', function () {
            should(() => escapeGlob(1)).throw(TypeError)
            should(() => escapeGlob(null)).throw(TypeError)
        })
    })

    describe('assertStringKey', function () {
        it('accepts a string', function () {
            should(assertStringKey('k')).be.undefined()
        })

        it('throws a TypeError for non-strings', function () {
            should(() => assertStringKey(1)).throw(/Cache key must be a string, got number/)
            should(() => assertStringKey(null)).throw(TypeError)
            should(() => assertStringKey(undefined)).throw(TypeError)
            should(() => assertStringKey({})).throw(TypeError)
        })
    })

    describe('assertStringPattern', function () {
        it('accepts a string', function () {
            should(assertStringPattern('*')).be.undefined()
        })

        it('throws a TypeError for non-strings', function () {
            should(() => assertStringPattern(1)).throw(/Cache scan pattern must be a string, got number/)
            should(() => assertStringPattern(/a/)).throw(TypeError)
        })
    })
})
