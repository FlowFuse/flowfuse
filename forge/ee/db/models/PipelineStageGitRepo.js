const { DataTypes } = require('sequelize')

module.exports = {
    name: 'PipelineStageGitRepo',
    schema: {
        url: {
            type: DataTypes.STRING,
            allowNull: false
        },
        branch: {
            type: DataTypes.STRING,
            allowNull: false,
            default: 'main'
        },
        lastPushAt: {
            type: DataTypes.DATE
        },
        status: {
            type: DataTypes.STRING,
            default: ''
        },
        statusMessage: {
            type: DataTypes.STRING,
            default: ''
        },
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
                            let targetFilename = 'snapshot.json'
                            if (options.sourceObject?.name) {
                                targetFilename = 'snapshot-' + options.sourceObject.name + '.json'
                            }
                            await app.gitops.pushToRepository({
                                token: gitToken.token,
                                url: this.url,
                                branch: this.branch,
                                credentialSecret: this.credentialSecret,
                                path: targetFilename
                            }, snapshot, options)

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
