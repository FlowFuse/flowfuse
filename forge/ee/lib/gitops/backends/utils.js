const { execFile } = require('node:child_process')
const { constants: fsConstants } = require('node:fs')
const fs = require('node:fs/promises')
const path = require('node:path')
const { promisify } = require('node:util')
const execFilePromised = promisify(execFile)

/**
 * Resolve a snapshot file path inside the cloned working directory.
 *
 * Strips a leading separator, rejects drive paths and `..` segments, confines
 * the result to a file inside the clone root, and rejects a symlink at the leaf or any parent component so a
 * committed symlink cannot redirect the read/write outside the clone.
 *
 * @param {String} workingDir the clone working directory
 * @param {String} p the configured snapshot path (relative to the clone)
 * @returns {Promise<String>} the resolved absolute file path
 * @throws {Error} if the path is not a safe file inside the clone
 */
async function resolveRepoFile (workingDir, p) {
    // A leading separator means the repository root, so it is stripped and the
    // path is treated as relative to the clone.
    const relative = String(p ?? '').replace(/^[\\/]+/, '')
    if (!relative || path.isAbsolute(relative) || relative.split(/[\\/]/).includes('..')) {
        throw new Error('Invalid repository path')
    }
    const root = await fs.realpath(workingDir)
    const target = path.resolve(root, relative)
    // The path must name a file inside the clone, not the clone root itself.
    if (!target.startsWith(root + path.sep)) {
        throw new Error('Invalid repository path')
    }
    let current = root
    for (const part of path.relative(root, target).split(path.sep)) {
        current = path.join(current, part)
        try {
            if ((await fs.lstat(current)).isSymbolicLink()) {
                throw new Error('Invalid repository path')
            }
        } catch (err) {
            if (err.code !== 'ENOENT') {
                throw err
            }
        }
    }
    return target
}

/**
 * Write a file without following a symlink at the final path (O_NOFOLLOW),
 * closing the window between the resolveRepoFile check and the write.
 *
 * @param {String} file the absolute file path
 * @param {String|Buffer} data the content to write
 */
async function writeRepoFile (file, data) {
    const flags = fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_TRUNC | (fsConstants.O_NOFOLLOW || 0)
    const handle = await fs.open(file, flags, 0o644)
    try {
        await handle.writeFile(data)
    } finally {
        await handle.close()
    }
}

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
    resolveRepoFile,
    validateRepoUrl,
    writeRepoFile
}
