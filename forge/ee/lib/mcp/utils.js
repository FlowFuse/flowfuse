const { PATH_ID_PATTERN, toolError } = require('./schemas')

// Strips credentials (including the password) before returning results to the caller.
function redactDatabaseCredentials (database) {
    if (!database) {
        return database
    }
    const { credentials, ...rest } = database
    return rest
}

// Blanks the value of hidden (secret) env vars, keeping the key and hidden flag.
function blankHiddenEnvValues (env) {
    const result = {}
    for (const [key, value] of Object.entries(env)) {
        if (value && typeof value === 'object' && value.hidden) {
            result[key] = { ...value, value: '' }
        } else {
            result[key] = value
        }
    }
    return result
}

// Some delete routes answer success with an empty body, which formatResponse
// cannot parse. Report those as { status: "okay" } so the call reads as done.
function emptySuccessAsOkay (response) {
    if (response.statusCode < 400 && !response.body) {
        return { statusCode: response.statusCode, json: () => ({ status: 'okay' }) }
    }
    return response
}

function hasControlChars (value) {
    return [...value].some((char) => {
        const code = char.charCodeAt(0)
        return code < 0x20 || code === 0x7f
    })
}

function decodeSegment (segment) {
    try {
        return decodeURIComponent(segment)
    } catch (err) {
        return segment
    }
}

// Every `...Id` argument is interpolated into a URL path, so it must be a single plain segment.
// Returns an error response for the first offender, or null when all are fine.
function validateIdArgs (args) {
    for (const [key, value] of Object.entries(args || {})) {
        if (/Id$/.test(key) && typeof value === 'string' && !PATH_ID_PATTERN.test(value)) {
            return toolError(400, 'invalid_request', `Input validation error: ${key} must contain only letters, digits, hyphen and underscore`)
        }
    }
    return null
}

// Backstop for values that are not ids (usernames, names, file paths): app.inject() resolves
// dot segments, so a path that reaches the URL as "..", or as "a%2F..%2Fb" once decoded, must
// not get through. File paths legitimately contain "/", which callers percent-encode into one
// segment, so only "..", "." and control characters are refused, never the separator itself.
function unsafePathSegment (url) {
    const path = url.split(/[?#]/)[0]
    for (const raw of path.split('/')) {
        const decoded = decodeSegment(raw)
        if (hasControlChars(decoded)) {
            return decoded
        }
        if (decoded === '.' || decoded === '..') {
            return decoded
        }
        if (decoded.split(/[/\\]/).includes('..')) {
            return decoded
        }
    }
    return null
}

// Wraps an inject function so that no request whose path could be re-routed by dot segments
// or control characters reaches the app.
function guardInject (inject) {
    return (opts) => {
        if (unsafePathSegment(opts.url) !== null) {
            return Promise.resolve(toolError(400, 'invalid_request', 'Input validation error: a value used in the request path contains a ".." segment or control characters'))
        }
        return inject(opts)
    }
}

module.exports = { redactDatabaseCredentials, blankHiddenEnvValues, emptySuccessAsOkay, validateIdArgs, guardInject }
