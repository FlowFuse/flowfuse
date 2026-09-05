/**
 * The locales the platform ships translations for.
 *
 * Shared between the i18n plugin, the API schemas that validate a user's
 * language preference, and the tests that assert locale files stay in step.
 * The frontend keeps its own copy of this list in `frontend/src/i18n.js`
 * because it is bundled separately; `test/unit/forge/i18n/locales_spec.js`
 * asserts the two do not drift apart.
 */

const en = require('../../locales/en/common.json')
const zhTW = require('../../locales/zh-TW/common.json')

const FALLBACK_LOCALE = 'en'

/**
 * Canonical locale tags. These are what a user's `language` preference may be
 * set to, and what the account settings UI offers.
 */
const SUPPORTED_LOCALES = ['en', 'zh-TW']

/**
 * Message catalogues, keyed by canonical locale.
 */
const catalogues = {
    en,
    'zh-TW': zhTW
}

/**
 * Extra tags browsers send that should resolve to a locale we ship rather than
 * falling back to English.
 *
 * `fastify-i18n` narrows a regional tag onto its base language — `ja-JP` finds
 * `ja` — but it does not widen a script-qualified tag onto a regional one, so
 * `zh-Hant-TW` would not find `zh-TW` on its own. Chrome reports exactly that
 * tag for Traditional Chinese on some platforms, so it is worth handling.
 */
const LOCALE_ALIASES = {
    'zh-Hant': 'zh-TW',
    'zh-Hant-TW': 'zh-TW'
}

const messages = { ...catalogues }
for (const [alias, canonical] of Object.entries(LOCALE_ALIASES)) {
    messages[alias] = catalogues[canonical]
}

module.exports = {
    FALLBACK_LOCALE,
    SUPPORTED_LOCALES,
    LOCALE_ALIASES,
    catalogues,
    messages
}
