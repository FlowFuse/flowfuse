const { execFile } = require('node:child_process')
const { existsSync } = require('node:fs')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const { promisify } = require('node:util')
const execFilePromised = promisify(execFile)

const { encryptValue, decryptValue } = require('../../../../db/utils')

const { cloneRepository } = require('./utils')

module.exports.init = async function (app) {
    /**
     * Push a snapshot to a git repository
     * @param {Object} repoOptions
     * @param {String} repoOptions.token
     * @param {String} repoOptions.url
     * @param {String} repoOptions.branch
     * @param {String} repoOptions.username
     * @param {Object} snapshot
     * @param {Object} options
     * @param {Object} options.sourceObject what produced the snapshot
     * @param {Object} options.user who triggered the pipeline
     * @param {Object} options.pipeline details of the pipeline
     */
    async function pushToRepository (repoOptions, snapshot, options) {
        let workingDir
        let caFile
        try {
            const branch = repoOptions.branch || 'main'
            if (!/^https:\/\//i.test(repoOptions.url)) {
                throw new Error('Only HTTPS git URLs are supported')
            }
            const url = new URL(repoOptions.url)
            url.username = repoOptions.username ? repoOptions.username : 'x-access-token'
            url.password = repoOptions.token

            workingDir = await fs.mkdtemp(path.join(os.tmpdir(), 'flowfuse-git-repo-'))

            let gitEnv = process.env
            if (repoOptions.caCertificate) {
                caFile = `${workingDir}-ca.pem`
                await fs.writeFile(caFile, repoOptions.caCertificate)
                gitEnv = { ...process.env, GIT_SSL_CAINFO: caFile }
            }

            // 3. clone repo
            await cloneRepository(url, branch, workingDir, gitEnv)

            // 4. set username/email
            await execFilePromised('git', ['config', 'user.email', 'no-reply@flowfuse.com'], { cwd: workingDir, env: gitEnv })
            await execFilePromised('git', ['config', 'user.name', 'FlowFuse'], { cwd: workingDir, env: gitEnv })
            // For local dev - disable gpg signing in case its set in global config
            await execFilePromised('git', ['config', 'commit.gpgsign', 'false'], { cwd: workingDir, env: gitEnv })

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
            if (snapshotExport.settings?.settings?.palette?.npmrc) {
                const enc = encryptValue(repoOptions.credentialSecret, snapshotExport.settings.settings?.palette?.npmrc)
                snapshotExport.settings.settings.palette.npmrc = { $: enc }
            }
            const snapshotFile = path.join(workingDir, repoOptions.path || 'snapshot.json').replace(/"/g, '')
            await fs.writeFile(snapshotFile, JSON.stringify(snapshotExport, null, 4))

            // 6. stage file
            await execFilePromised('git', ['add', snapshotFile], { cwd: workingDir, env: gitEnv })

            // 7. commit
            const commitMessage = `Update snapshot\n\nSnapshot updated by FlowFuse Pipeline '${options.pipeline.name}', triggered by ${options.user.username}`
            await execFilePromised('git', ['commit', '-m', commitMessage], { cwd: workingDir, env: gitEnv })

            try {
                // 8. push
                await execFilePromised('git', ['push'], { cwd: workingDir, env: gitEnv })
            } catch (err) {
                const output = err.stdout + err.stderr
                if (/unable to access/.test(output)) {
                    const result = new Error('Permission denied')
                    result.code = 'invalid_token'
                    result.cause = err
                    throw result
                }
                let error
                const m = /fatal: (.*)/.exec(output)
                if (m) {
                    error = new Error('Failed to push repository: ' + m[1])
                } else {
                    error = Error('Failed to push repository')
                }
                error.cause = err
                throw error
            }
        } finally {
            if (workingDir) {
                try {
                    await fs.rm(workingDir, { recursive: true, force: true })
                } catch (err) {}
            }
            if (caFile) {
                try {
                    await fs.rm(caFile, { force: true })
                } catch (err) {}
            }
        }
    }

    /**
     * Push a snapshot to a git repository
     * @param {Object} repoOptions
     * @param {String} repoOptions.token
     * @param {String} repoOptions.url
     * @param {String} repoOptions.branch
     * @param {String} repoOptions.username
     */
    async function pullFromRepository (repoOptions) {
        let workingDir
        let caFile
        try {
            const branch = repoOptions.branch || 'main'
            if (!/^https:\/\//i.test(repoOptions.url)) {
                throw new Error('Only HTTPS git URLs are supported')
            }
            const url = new URL(repoOptions.url)
            url.username = repoOptions.username ? repoOptions.username : 'x-access-token'
            url.password = repoOptions.token

            workingDir = await fs.mkdtemp(path.join(os.tmpdir(), 'flowfuse-git-repo-'))

            let gitEnv = process.env
            if (repoOptions.caCertificate) {
                caFile = `${workingDir}-ca.pem`
                await fs.writeFile(caFile, repoOptions.caCertificate)
                gitEnv = { ...process.env, GIT_SSL_CAINFO: caFile }
            }

            // 3. clone repo
            await cloneRepository(url, branch, workingDir, gitEnv)

            const snapshotFile = path.join(workingDir, repoOptions.path || 'snapshot.json').replace(/"/g, '')

            if (!existsSync(snapshotFile)) {
                throw new Error('Snapshot file not found in repository')
            }

            try {
                const snapshotContent = await fs.readFile(snapshotFile, 'utf8')
                const snapshot = JSON.parse(snapshotContent)
                if (snapshot.settings?.env) {
                    const keys = Object.keys(snapshot.settings.env)
                    keys.forEach((key) => {
                        const env = snapshot.settings.env[key]
                        if (env.hidden && env.$) {
                            // Decrypt the value if it is encrypted
                            env.value = decryptValue(repoOptions.credentialSecret, env.$)
                            delete env.$
                        }
                    })
                }
                if (snapshot.settings?.settings?.palette?.npmrc) {
                    const npmrc = snapshot.settings.settings.palette.npmrc
                    if (typeof npmrc === 'object' && npmrc.$) {
                        snapshot.settings.settings.palette.npmrc = decryptValue(repoOptions.credentialSecret, npmrc.$)
                    }
                }
                return snapshot
            } catch (err) {
                throw new Error('Failed to read snapshot file: ' + err.message)
            }
        } finally {
            if (workingDir) {
                try {
                    await fs.rm(workingDir, { recursive: true, force: true })
                } catch (err) {}
            }
            if (caFile) {
                try {
                    await fs.rm(caFile, { force: true })
                } catch (err) {}
            }
        }
    }
    return {
        pushToRepository,
        pullFromRepository
    }
}
