// Strips credentials (including the password) before returning results to the caller.
function redactDatabaseCredentials (database) {
    if (!database) {
        return database
    }
    const { credentials, ...rest } = database
    return rest
}

module.exports = { redactDatabaseCredentials }
