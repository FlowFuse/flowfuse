const fs = require('fs')
const path = require('path')

const should = require('should')

const { FALLBACK_LOCALE, LOCALE_ALIASES, SUPPORTED_LOCALES, catalogues, messages } = require('../../../../forge/i18n/locales')

const ROOT = path.join(__dirname, '..', '..', '..', '..')
const BACKEND_LOCALE_DIR = path.join(ROOT, 'locales')
const FRONTEND_LOCALE_DIR = path.join(ROOT, 'frontend', 'src', 'locales')

/**
 * Flatten a nested message object into dotted key paths, so two locales can be
 * compared on the keys they actually define rather than on object shape.
 */
function flattenKeys (obj, prefix = '') {
    return Object.entries(obj).reduce((keys, [key, value]) => {
        const full = prefix ? `${prefix}.${key}` : key
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            return keys.concat(flattenKeys(value, full))
        }
        keys.push(full)
        return keys
    }, [])
}

function readJSON (file) {
    return JSON.parse(fs.readFileSync(file, 'utf-8'))
}

describe('i18n plugin', function () {
    // Exercised on a bare Fastify instance rather than the whole platform, so
    // this asserts the plugin itself negotiates and translates correctly
    // without needing a database or a session.
    let app

    before(async function () {
        app = require('fastify')()
        await app.register(require('../../../../forge/i18n'))
        app.get('/probe', async (request) => ({
            locale: request.i18n.locale,
            greeting: request.i18n.t('email.greeting', { name: 'Ada' })
        }))
        await app.ready()
    })

    after(async function () {
        await app?.close()
    })

    it('interpolates a message in the fallback locale', async function () {
        const response = await app.inject({ method: 'GET', url: '/probe' })
        response.statusCode.should.equal(200)
        response.json().greeting.should.equal('Hello Ada,')
    })

    it('negotiates a locale from Accept-Language', async function () {
        const response = await app.inject({
            method: 'GET',
            url: '/probe',
            headers: { 'accept-language': 'zh-TW' }
        })
        response.json().greeting.should.equal('Ada 您好,')
    })

    it('resolves a script-qualified tag via LOCALE_ALIASES', async function () {
        // fastify-i18n does not widen `zh-Hant-TW` onto `zh-TW` by itself; the
        // alias entry in forge/i18n/locales.js is what makes this resolve.
        const response = await app.inject({
            method: 'GET',
            url: '/probe',
            headers: { 'accept-language': 'zh-Hant-TW' }
        })
        response.json().greeting.should.equal('Ada 您好,')
    })

    it('narrows a regional tag onto its base language', async function () {
        // `en-GB` has no catalogue of its own but finds `en`
        const response = await app.inject({
            method: 'GET',
            url: '/probe',
            headers: { 'accept-language': 'en-GB' }
        })
        response.json().greeting.should.equal('Hello Ada,')
    })

    it('falls back for a locale we do not ship', async function () {
        const response = await app.inject({
            method: 'GET',
            url: '/probe',
            headers: { 'accept-language': 'fr-FR' }
        })
        response.json().greeting.should.equal('Hello Ada,')
    })
})

describe('i18n locales', function () {
    it('includes the fallback locale in the supported list', function () {
        SUPPORTED_LOCALES.should.containEql(FALLBACK_LOCALE)
    })

    it('loads a catalogue for every supported locale, and no others', function () {
        Object.keys(catalogues).sort().should.eql([...SUPPORTED_LOCALES].sort())
    })

    it('points every alias at a catalogue we ship', function () {
        Object.entries(LOCALE_ALIASES).forEach(([alias, canonical]) => {
            SUPPORTED_LOCALES.should.containEql(canonical, `${alias} aliases unknown locale ${canonical}`)
            messages[alias].should.equal(catalogues[canonical])
        })
    })

    it('does not alias a tag that is already a supported locale', function () {
        Object.keys(LOCALE_ALIASES).forEach(alias => {
            SUPPORTED_LOCALES.should.not.containEql(alias)
        })
    })

    describe('backend locale files', function () {
        it('has a common.json for every supported locale', function () {
            SUPPORTED_LOCALES.forEach(locale => {
                const file = path.join(BACKEND_LOCALE_DIR, locale, 'common.json')
                fs.existsSync(file).should.equal(true, `missing ${file}`)
            })
        })

        it('defines the same keys in every locale as the fallback', function () {
            const expected = flattenKeys(readJSON(path.join(BACKEND_LOCALE_DIR, FALLBACK_LOCALE, 'common.json'))).sort()
            SUPPORTED_LOCALES.filter(l => l !== FALLBACK_LOCALE).forEach(locale => {
                const actual = flattenKeys(readJSON(path.join(BACKEND_LOCALE_DIR, locale, 'common.json'))).sort()
                actual.should.eql(expected, `locales/${locale}/common.json is out of step with ${FALLBACK_LOCALE}`)
            })
        })
    })

    describe('frontend locale files', function () {
        it('has a locale file for every supported locale', function () {
            SUPPORTED_LOCALES.forEach(locale => {
                const file = path.join(FRONTEND_LOCALE_DIR, `${locale}.json`)
                fs.existsSync(file).should.equal(true, `missing ${file}`)
            })
        })

        it('defines the same keys in every locale as the fallback', function () {
            const expected = flattenKeys(readJSON(path.join(FRONTEND_LOCALE_DIR, `${FALLBACK_LOCALE}.json`))).sort()
            SUPPORTED_LOCALES.filter(l => l !== FALLBACK_LOCALE).forEach(locale => {
                const actual = flattenKeys(readJSON(path.join(FRONTEND_LOCALE_DIR, `${locale}.json`))).sort()
                actual.should.eql(expected, `frontend/src/locales/${locale}.json is out of step with ${FALLBACK_LOCALE}`)
            })
        })

        it('advertises the same locales as the backend', function () {
            // The frontend keeps its own copy of the list because it is bundled
            // separately. Parsed from source rather than imported, since that
            // module is ESM and pulls in vue-i18n.
            const source = fs.readFileSync(path.join(ROOT, 'frontend', 'src', 'i18n.js'), 'utf-8')
            const block = source.match(/SUPPORTED_LOCALES\s*=\s*\[([\s\S]*?)\]/)
            should.exist(block, 'could not find SUPPORTED_LOCALES in frontend/src/i18n.js')
            const declared = [...block[1].matchAll(/value:\s*'([^']+)'/g)].map(m => m[1])
            declared.sort().should.eql([...SUPPORTED_LOCALES].sort(),
                'frontend/src/i18n.js and forge/i18n/locales.js disagree on supported locales')
        })
    })
})
