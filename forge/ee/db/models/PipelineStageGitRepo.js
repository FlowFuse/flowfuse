const { DataTypes } = require('sequelize')

module.exports = {
    name: 'PipelineStageGitRepo',
    schema: {
        url: {
            type: DataTypes.STRING,
            allowNull: false
        },
        // The branch to push updates to
        branch: {
            type: DataTypes.STRING,
            allowNull: false,
            default: 'main'
        },
        // The branch to pull updates from. Defaults to '', meaning
        // use the same as 'branch'.
        pullBranch: {
            type: DataTypes.STRING,
            default: ''
        },
        // The path to push to in the repo. If blank, derives the name
        // from the source of the snapshot.
        pushPath: {
            type: DataTypes.STRING,
            default: ''
        },
        // The path that was actually pushed to the last time the stage ran.
        // Allows the pull operation to retrieve the file if it was derived
        lastPushPath: {
            type: DataTypes.STRING,
            default: ''
        },
        // When the last push ran
        lastPushAt: {
            type: DataTypes.DATE
        },
        // The path to pull from. If blank, uses 'lastPushPath'. If that is also
        // blank, it will fail.
        pullPath: {
            type: DataTypes.STRING,
            default: ''
        },
        // When the last pull ran
        lastPullAt: {
            type: DataTypes.DATE
        },
        // The last status of the stage
        status: {
            type: DataTypes.STRING,
            default: ''
        },
        // Any message associated with the last status
        statusMessage: {
            type: DataTypes.STRING,
            default: ''
        },
        // The credential secret to use for export/import of the flows
        credentialSecret: {
            type: DataTypes.STRING,
            default: ''
        }
    },
    options: {
        timestamps: false
    },
    associations: function (M) {
        this.belongsTo(M.PipelineStage)
        this.belongsTo(M.GitToken, { onDelete: 'SET NULL' })
    },
    meta: {
        slug: false,
        hashid: false,
        links: false
    },
    finders: function (M, app) {
        return {
            instance: {
                /**
                 * @param {Object} snapshot
                 * @param {Object} options
                 * @param {Object} options.sourceObject
                 * @param {Object} options.user
                 * @param {Object} options.pipeline
                 */
                deploy: async function (snapshot, options) {
                    // console.log('Deploying to Git Repo')
                    // console.log(`${this.url}#${this.branch}`)
                    this.lastPushAt = Date.now()
                    this.status = 'pushing'
                    this.statusMessage = ''
                    await this.save()
                    setImmediate(async () => {
                        try {
                            const gitToken = await this.getGitToken()
                            let targetFilename = this.pushPath
                            if (options.sourceObject?.name) {
                                targetFilename = 'snapshot-' + options.sourceObject.name + '.json'
                            }
                            if (!targetFilename) {
                                targetFilename = 'snapshot.json'
                            }
                            await app.gitops.pushToRepository({
                                token: gitToken.token,
                                url: this.url,
                                branch: this.branch,
                                credentialSecret: this.credentialSecret,
                                path: targetFilename
                            }, snapshot, options)

                            this.lastPushPath = targetFilename
                            this.status = 'success'
                            this.statusMessage = ''
                            await this.save()
                        } catch (err) {
                            this.status = 'error'
                            this.statusMessage = err.message
                            await this.save()

                            app.log.warn(`Failed to deploy pipeline stage ${M.PipelineStage.encodeHashid(this.PipelineStageId)}: ${err.message}`)
                            if (!err.code) {
                                app.log.error(err)
                            }
                        }
                    })
                }
            }
        }
    }
}
