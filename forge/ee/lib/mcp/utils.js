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

module.exports = { redactDatabaseCredentials, blankHiddenEnvValues, emptySuccessAsOkay }
