const { execFile } = require('node:child_process')
const { promisify } = require('node:util')
const execFilePromised = promisify(execFile)

/**
 * Parse a repository URL and confirm it is safe to send a token to.
 *
 * Requires https for every backend. When allowedHosts is given (the github and
 * azure backends pin a fixed host), it also forbids embedded userinfo so a
 * lookalike like `github.com@evil.example` cannot capture the token, and
 * requires an exact hostname match. Generic repos are user-chosen and the
 * backend overwrites any userinfo with the configured credential, so neither
 * check would add protection there.
 *
 * @param {String} rawUrl the configured repository URL
 * @param {Object} [options]
 * @param {String[]} [options.allowedHosts] lowercase hostnames the URL must match exactly
 * @returns {URL} the parsed URL
 * @throws {Error} if the URL is not valid for use
 */
function validateRepoUrl (rawUrl, { allowedHosts } = {}) {
    let url
    try {
        url = new URL(rawUrl)
    } catch (err) {
        const error = new Error('Invalid repository URL')
        error.code = 'invalid_url'
        error.cause = err
        throw error
    }
    if (url.protocol !== 'https:') {
        const error = new Error('Invalid repository URL')
        error.code = 'invalid_url'
        throw error
    }
    if (allowedHosts) {
        if (url.username || url.password) {
            const error = new Error('Invalid repository URL')
            error.code = 'invalid_url'
            throw error
        }
        if (!allowedHosts.includes(url.hostname.toLowerCase())) {
            const error = new Error('Invalid repository URL')
            error.code = 'invalid_host'
            throw error
        }
    }
    return url
}

async function cloneRepository (url, branch, workingDir, env) {
    try {
        await execFilePromised('git', ['clone', '-b', branch, '--depth', '1', '--single-branch', url.toString(), '.'], { cwd: workingDir, env })
    } catch (err) {
        const output = err.stdout + err.stderr
        // Token does not have access to clone the repo
        if (/unable to access/.test(output)) {
            const result = new Error('Permission denied')
            result.code = 'invalid_token'
            result.cause = err
            throw result
        }
        // Remote branch does not exist
        if (/Could not find remote branch|Remote branch .+ not found/.test(output)) {
            const result = new Error('Branch not found')
            result.code = 'invalid_branch'
            throw result
        }
        let error
        // Fallback - try to extract the 'fatal' line from the output
        const m = /fatal: (.*)/.exec(output)
        if (m) {
            error = new Error('Failed to clone repository: ' + m[1])
        } else {
            error = new Error('Failed to clone repository')
        }
        error.cause = err
        throw error
    }
}

module.exports = {
    cloneRepository,
    validateRepoUrl
}
