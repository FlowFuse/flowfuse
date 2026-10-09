/**
 * Helpers for platform announcements.
 *
 * Announcement bodies are authored by platform admins and rendered in the
 * notifications drawer. Anything that ends up inside an iframe src is
 * normalised here, server side, so the front-end never builds an embed URL
 * out of free text.
 */

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/

/**
 * Turn a user-supplied video link into a structured, safe reference.
 *
 * Only YouTube is supported. The video id is extracted and validated, so the
 * front-end can build the embed URL from a known-good id rather than from the
 * string an admin typed.
 *
 * @param {string} value a YouTube watch, share or embed URL, or a bare video id
 * @returns {{provider: string, id: string}|null} null when nothing usable was found
 */
function parseVideoReference (value) {
    if (typeof value !== 'string') {
        return null
    }
    const trimmed = value.trim()
    if (!trimmed) {
        return null
    }
    if (YOUTUBE_ID.test(trimmed)) {
        return { provider: 'youtube', id: trimmed }
    }
    let url
    try {
        url = new URL(trimmed)
    } catch (_err) {
        return null
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        return null
    }
    const host = url.hostname.replace(/^www\./, '')
    let candidate = null
    if (host === 'youtu.be') {
        candidate = url.pathname.slice(1)
    } else if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
        if (url.pathname === '/watch') {
            candidate = url.searchParams.get('v')
        } else if (url.pathname.startsWith('/embed/')) {
            candidate = url.pathname.slice('/embed/'.length)
        } else if (url.pathname.startsWith('/shorts/')) {
            candidate = url.pathname.slice('/shorts/'.length)
        } else if (url.pathname.startsWith('/live/')) {
            candidate = url.pathname.slice('/live/'.length)
        }
    }
    if (candidate && YOUTUBE_ID.test(candidate)) {
        return { provider: 'youtube', id: candidate }
    }
    return null
}

// A path rooted at the platform itself. Excludes '//host' and '/\\host', which
// browsers resolve to another origin despite starting with a slash.
const IN_APP_PATH = /^\/(?![/\\])/
// The URL parser strips these before parsing, so '/<tab>/host' reaches the
// browser as '//host'. Nothing legitimate needs them, so refuse them outright
// rather than trying to normalise.
const STRIPPED_BY_URL_PARSER = /[\t\n\r]/

/**
 * Validate a link an admin wants a recipient to follow.
 *
 * Accepts an absolute http(s) URL, or a path within the platform. Anything
 * else, notably `javascript:` and `data:`, and anything that looks like a path
 * but resolves to another origin, is rejected.
 *
 * @param {string} value
 * @returns {string|null} the link, or null when it is not safe to render
 */
function parseLinkUrl (value) {
    if (typeof value !== 'string') {
        return null
    }
    const target = value.trim()
    if (!target || STRIPPED_BY_URL_PARSER.test(target)) {
        return null
    }
    let url = null
    try {
        // No base: an absolute url parses, anything relative throws
        url = new URL(target)
    } catch (_err) {
        url = null
    }
    if (url) {
        return (url.protocol === 'https:' || url.protocol === 'http:') ? target : null
    }
    return IN_APP_PATH.test(target) ? target : null
}

/**
 * Validate an admin-supplied call-to-action.
 *
 * @param {{label: string, url: string}} value
 * @returns {{label: string, url: string}|null} null when incomplete, or the url is not safe to render
 */
function parseCallToAction (value) {
    if (!value || typeof value !== 'object') {
        return null
    }
    const label = typeof value.label === 'string' ? value.label.trim() : ''
    const target = parseLinkUrl(typeof value.url === 'string' ? value.url : '')
    if (!label || !target) {
        return null
    }
    return { label, url: target }
}

module.exports = {
    parseVideoReference,
    parseCallToAction,
    parseLinkUrl
}
