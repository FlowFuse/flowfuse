const fastifyI18n = require('fastify-i18n')
const fp = require('fastify-plugin')

const { FALLBACK_LOCALE, messages } = require('./locales')

/**
 * Server-side internationalisation.
 *
 * Decorates the request with `request.i18n`, whose `t()` resolves a key against
 * the locale negotiated from the request's `Accept-Language` header, falling
 * back to English. `fastify-i18n` narrows a regional tag onto its base language
 * — `en-GB` finds `en` — but does not widen a script-qualified tag onto a
 * regional one, which is why `forge/i18n/locales.js` declares LOCALE_ALIASES so
 * `zh-Hant-TW` resolves to `zh-TW` instead of falling back to English.
 *
 * Note on scope: existing API error strings are deliberately NOT routed through
 * this. Several of them are part of the de-facto contract — the frontend
 * branches on `err.response.data.error === 'user registration not enabled'`
 * (frontend/src/pages/account/Create.vue) and a unit test matches the same
 * literal — so translating them would be a breaking change. Those responses
 * already carry a stable `code` field, which is the right thing for callers to
 * branch on; migrating consumers to it is a separate piece of work. See
 * docs/contribute/i18n.md.
 */
module.exports = fp(async function (app, opts) {
    await app.register(fastifyI18n, {
        fallbackLocale: FALLBACK_LOCALE,
        messages
    })
}, { name: 'app.i18n' })
