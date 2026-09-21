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

module.exports = { redactDatabaseCredentials, blankHiddenEnvValues }
