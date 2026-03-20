const { exec } = require('node:child_process')
const { promisify } = require('node:util')
const execPromised = promisify(exec)

async function cloneRepository (url, branch, workingDir) {
    try {
        await execPromised(`git clone -b ${branch} --depth 1 --single-branch ${url.toString()} .`, { cwd: workingDir })
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
    cloneRepository
}
