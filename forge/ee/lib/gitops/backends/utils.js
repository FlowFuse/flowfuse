const { execFile } = require('node:child_process')
const { constants: fsConstants } = require('node:fs')
const fs = require('node:fs/promises')
const path = require('node:path')
const { promisify } = require('node:util')
const execFilePromised = promisify(execFile)

/**
 * Resolve a snapshot file path inside the cloned working directory.
 *
 * Rejects absolute paths and `..` segments, confines the result to the clone
 * root, and rejects a symlink at the leaf or any parent component so a
 * committed symlink cannot redirect the read/write outside the clone.
 *
 * @param {String} workingDir the clone working directory
 * @param {String} p the configured snapshot path (relative to the clone)
 * @returns {Promise<String>} the resolved absolute file path
 * @throws {Error} if the path is not a safe file inside the clone
 */
async function resolveRepoFile (workingDir, p) {
    if (!p || path.isAbsolute(p) || p.split(/[\\/]/).includes('..')) {
        throw new Error('Invalid repository path')
    }
    const root = await fs.realpath(workingDir)
    const target = path.resolve(root, p)
    if (target !== root && !target.startsWith(root + path.sep)) {
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
    writeRepoFile
}
