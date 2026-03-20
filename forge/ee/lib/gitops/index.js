const { exec } = require('node:child_process')
const { promisify } = require('node:util')
const execPromised = promisify(exec)

module.exports.init = async function (app) {
    // Check if git is installed
    try {
        await execPromised('git --version')
    } catch (err) {
        // Error running git
        app.log.warn('Git integration is disabled: git command not found')
        return
    }

    // load backends
    const github = await require('./backends/github').init(app)
    const azure = await require('./backends/azure').init(app)

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
        if (repoOptions.tokenType === 'github') {
            github.pushToRepository(repoOptions, snapshot, options)
        } else if (repoOptions.tokenType === 'azure') {
            azure.pushToRepository(repoOptions, snapshot, options)
        }
    }

    /**
     * Push a snapshot to a git repository
     * @param {Object} repoOptions
     * @param {String} repoOptions.token
     * @param {String} repoOptions.url
     * @param {String} repoOptions.branch
     */
    async function pullFromRepository (repoOptions) {
        if (repoOptions.tokenType === 'github') {
            return github.pullFromRepository(repoOptions)
        } else if (repoOptions.tokenType === 'azure') {
            return azure.pullFromRepository(repoOptions)
        }
    }

    return {
        pushToRepository,
        pullFromRepository
    }
}
