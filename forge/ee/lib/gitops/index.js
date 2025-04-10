const { exec } = require('node:child_process')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const { promisify } = require('node:util')
const execPromised = promisify(exec)

const axios = require('axios')

module.exports.init = async function (app) {
    // Check if git is installed
    try {
        await execPromised('git --version')
    } catch (err) {
        // Error running git
        app.log.warn('Git integration is disabled: git command not found')
        return
    }

    // Set the git feature flag
    app.config.features.register('gitIntegration', true, true)

    /**
     * Push a snapshot to a git repository
     * @param {Object} repoOptions
     * @param {String} repoOptions.token
     * @param {String} repoOptions.url
     * @param {String} repoOptions.branch
     * @param {Object} snapshot
     * @param {Object} options
     * @param {Object} options.sourceObject what produced the snapshot
     * @param {Object} options.user who triggered the pipeline
     * @param {Object} options.pipeline details of the pipeline
     */
    async function pushToRepository (repoOptions, snapshot, options) {
        let workingDir
        try {
            const token = repoOptions.token
            const branch = repoOptions.branch || 'main'
            if (!/^https:\/\/github.com/i.test(repoOptions.url)) {
                throw new Error('Only GitHub repositories are supported')
            }
            const url = new URL(repoOptions.url)
            url.username = 'x-access-token'
            url.password = token

            // 2. get user details so we can properly attribute the commit
            let userDetails
            try {
                userDetails = await axios.get('https://api.github.com/user', {
                    headers: {
                        Accept: 'application/vnd.github+json',
                        Authorization: `Bearer ${token}`,
                        'X-GitHub-Api-Version': '2022-11-28'
                    }
                })
            } catch (err) {
                const result = new Error('Invalid git token')
                result.code = 'invalid_token'
                result.cause = err
                throw result
            }

            const userGitName = userDetails.data.login
            const userGitEmail = `${userDetails.data.id}+${userDetails.data.login}@users.noreply.github.com`
            const author = `${userGitName} <${userGitEmail}>`.replace(/"/g, '\\"')
            workingDir = await fs.mkdtemp(path.join(os.tmpdir(), 'flowfuse-git-repo-'))

            // 3. clone repo
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
                // Fallback - try to extract the 'fatal' line from the output
                const m = /fatal: (.*)/.exec(output)
                if (m) {
                    throw new Error('Failed to clone repository: ' + m[1])
                }
                throw new Error('Failed to clone repository')
            }

            // 4. set username/email
            await execPromised('git config user.email "no-reply@flowfuse.com"', { cwd: workingDir })
            await execPromised('git config user.name "FlowFuse"', { cwd: workingDir })
            // For local dev - disable gpg signing in case its set in global config
            await execPromised('git config commit.gpgsign false', { cwd: workingDir })

            // 5. export snapshot
            const exportOptions = {
                credentialSecret: repoOptions.credentialSecret,
                components: {
                    flows: true,
                    credentials: true
                }
            }
            const result = await app.db.controllers.Snapshot.exportSnapshot(snapshot, exportOptions)
            const snapshotExport = app.db.views.ProjectSnapshot.snapshotExport(result)
            const snapshotFile = path.join(workingDir, repoOptions.path || 'snapshot.json')
            await fs.writeFile(snapshotFile, JSON.stringify(snapshotExport, null, 4))

            // 6. stage file
            await execPromised(`git add ${snapshotFile}`, { cwd: workingDir })

            // 7. commit
            await execPromised(`git commit -m "Update snapshot\n\nSnapshot updated by FlowFuse Pipeline '${options.pipeline.name.replace(/"/g, '')}', triggered by ${options.user.username.replace(/"/g, '')}" --author="${author}"`, { cwd: workingDir })

            try {
                // 8. push
                await execPromised('git push', { cwd: workingDir })
            } catch (err) {
                const output = err.stdout + err.stderr
                if (/unable to access/.test(output)) {
                    const result = new Error('Permission denied')
                    result.code = 'invalid_token'
                    result.cause = err
                    throw result
                }
                const m = /fatal: (.*)/.exec(output)
                if (m) {
                    throw new Error('Failed to push repository: ' + m[1])
                }
                throw new Error('Failed to push repository')
            }
        } finally {
            if (workingDir) {
                try {
                    await fs.rm(workingDir, { recursive: true, force: true })
                } catch (err) {}
            }
        }
    }

    return {
        pushToRepository
    }
}
