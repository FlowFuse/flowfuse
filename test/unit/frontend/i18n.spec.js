import { describe, expect, it } from 'vitest'

import { FALLBACK_LOCALE, SUPPORTED_LOCALES, resolveLocale } from '../../../frontend/src/i18n.js'

describe('i18n', () => {
    describe('SUPPORTED_LOCALES', () => {
        it('includes the fallback locale', () => {
            expect(SUPPORTED_LOCALES.map(l => l.value)).toContain(FALLBACK_LOCALE)
        })

        it('gives every locale a label', () => {
            SUPPORTED_LOCALES.forEach(locale => {
                expect(locale.label, `${locale.value} has no label`).toBeTruthy()
            })
        })
    })

    describe('resolveLocale', () => {
        it('passes through a locale we ship', () => {
            expect(resolveLocale('en')).toBe('en')
            expect(resolveLocale('zh-TW')).toBe('zh-TW')
        })

        it('matches case-insensitively', () => {
            expect(resolveLocale('zh-tw')).toBe('zh-TW')
            expect(resolveLocale('EN')).toBe('en')
        })

        it('narrows a script-qualified tag to the regional locale', () => {
            // What Chrome reports for Traditional Chinese on some platforms
            expect(resolveLocale('zh-Hant-TW')).toBe('zh-TW')
        })

        it('resolves a bare base language to a regional locale we ship', () => {
            expect(resolveLocale('zh')).toBe('zh-TW')
        })

        it('falls back for anything we do not ship', () => {
            expect(resolveLocale('fr-FR')).toBe(FALLBACK_LOCALE)
            expect(resolveLocale('klingon')).toBe(FALLBACK_LOCALE)
        })

        it('falls back when given nothing', () => {
            expect(resolveLocale(undefined)).toBe(FALLBACK_LOCALE)
            expect(resolveLocale('')).toBe(FALLBACK_LOCALE)
            expect(resolveLocale(null)).toBe(FALLBACK_LOCALE)
        })
    })
})
