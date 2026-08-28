import { createI18n } from 'vue-i18n'

import en from './locales/en.json'
import zhTW from './locales/zh-TW.json'

export const FALLBACK_LOCALE = 'en'

/**
 * Locales the platform ships translations for.
 *
 * `label` is deliberately written in the language itself — someone looking for
 * their own language should not have to read English to find it.
 */
export const SUPPORTED_LOCALES = [
    { value: 'en', label: 'English' },
    { value: 'zh-TW', label: '繁體中文' }
]

const messages = {
    en,
    'zh-TW': zhTW
}

const STORAGE_KEY = 'ff-locale'

/**
 * Map an arbitrary locale tag onto one we actually have messages for.
 *
 * Falls back through the base language so `zh-Hant-TW` and `zh-TW` both land on
 * `zh-TW`, and anything unrecognised lands on `en` rather than rendering keys.
 *
 * @param {string} [tag] a BCP 47 locale tag
 * @returns {string} a locale present in SUPPORTED_LOCALES
 */
export function resolveLocale (tag) {
    if (!tag) {
        return FALLBACK_LOCALE
    }
    const supported = SUPPORTED_LOCALES.map(l => l.value)
    if (supported.includes(tag)) {
        return tag
    }
    const lower = tag.toLowerCase()
    const exact = supported.find(l => l.toLowerCase() === lower)
    if (exact) {
        return exact
    }
    // `zh-Hant-TW` -> try `zh-TW`, then any locale sharing the base language
    const base = lower.split('-')[0]
    const regional = supported.find(l => l.toLowerCase().startsWith(`${base}-`))
    if (regional) {
        return regional
    }
    const baseMatch = supported.find(l => l.toLowerCase() === base)
    return baseMatch || FALLBACK_LOCALE
}

/**
 * The locale to start up with.
 *
 * The login and sign-up pages render before there is a session, so there is no
 * stored user preference to read at that point. We use the last locale this
 * browser was set to, then the browser's own language, then English.
 */
function initialLocale () {
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
            return resolveLocale(stored)
        }
    } catch { /* localStorage unavailable — fall through to navigator */ }
    return resolveLocale(navigator.language)
}

const i18n = createI18n({
    locale: initialLocale(),
    fallbackLocale: FALLBACK_LOCALE,
    messages,
    legacy: false,
    globalInjection: true,
    // Falling back to `en` is intended behaviour, not a problem to report on
    // every render while a locale is still being translated.
    missingWarn: false,
    fallbackWarn: false
})

/**
 * Switch the active locale and remember it for the next pre-session page load.
 *
 * @param {string} tag a BCP 47 locale tag; unrecognised values fall back to `en`
 * @returns {string} the locale that was actually applied
 */
export function setLocale (tag) {
    const resolved = resolveLocale(tag)
    i18n.global.locale.value = resolved
    document.documentElement.setAttribute('lang', resolved)
    try {
        localStorage.setItem(STORAGE_KEY, resolved)
    } catch { /* ignore — the locale still applies for this page load */ }
    return resolved
}

/**
 * Translate a key from outside a component.
 *
 * Component templates and options use `$t`, which vue-i18n injects. Display
 * strings defined in plain JS - table column headers, dialog copy, route meta
 * titles - have no component instance to hang that off, so they call this.
 *
 * Note this is evaluated where it is called. At module scope that means once,
 * at import time, so such strings follow the locale chosen for the page load
 * rather than updating live when the locale changes.
 *
 * @param {string} key a message key, e.g. 'ui.saveChanges'
 * @param {object} [named] interpolation values
 * @returns {string} the translated message
 */
export function t (key, named) {
    return named ? i18n.global.t(key, named) : i18n.global.t(key)
}

document.documentElement.setAttribute('lang', i18n.global.locale.value)

export default i18n
