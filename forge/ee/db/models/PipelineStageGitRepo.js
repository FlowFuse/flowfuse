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
                            if (!targetFilename && options.sourceObject?.name) {
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

                            app.log.warn(`Failed to deploy pipeline stage ${M.PipelineStage.encodeHashid(this.PipelineStageId)} (push): ${err.message}`)
                            if (!err.code) {
                                app.log.error(err)
                            }
                        }
                    })
                },

                /**
                 * @param {Object} options.targetObject
                 * @param {Object} options.user
                 * @param {Object} options.pipeline
                 */
                pull: async function (options) {
                    this.lastPullAt = Date.now()
                    this.status = 'pulling'
                    this.statusMessage = ''
                    await this.save()
                    try {
                        const gitToken = await this.getGitToken()
                        let sourceFilename = this.pullPath
                        if (!sourceFilename) {
                            sourceFilename = this.lastPushPath
                        }
                        if (!sourceFilename) {
                            sourceFilename = this.pushPath
                        }
                        if (!sourceFilename) {
                            throw new Error('No source filename to pull from')
                        }
                        const snapshotContent = await app.gitops.pullFromRepository({
                            token: gitToken.token,
                            url: this.url,
                            branch: this.pullBranch || this.branch,
                            path: sourceFilename
                        }, options)
                        // snapshotContent is a JSON representation of the snapshot. We need to convert it to a
                        // ProjectSnapshot object - but not save it to the database as it will get copied to a new
                        // ProjectSnapshot object for the target of the deployment.
                        const snapshot = app.db.models.ProjectSnapshot.build({
                            name: snapshotContent.name,
                            description: snapshotContent.description,
                            credentialSecret: this.credentialSecret,
                            flows: snapshotContent.flows,
                            settings: snapshotContent.settings
                        })
                        this.status = 'success'
                        this.statusMessage = ''
                        await this.save()
                        return snapshot
                    } catch (err) {
                        this.status = 'error'
                        this.statusMessage = err.message
                        await this.save()

                        app.log.warn(`Failed to deploy pipeline stage ${M.PipelineStage.encodeHashid(this.PipelineStageId)} (pull): ${err.message}`)
                        if (!err.code) {
                            app.log.error(err)
                        }
                        return null
                    }
                }
            }
        }
    }
}
