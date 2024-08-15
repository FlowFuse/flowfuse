const { KEY_SHARED_ASSETS } = require('../../../db/models/ProjectSettings')

module.exports = async function (app) {
    app.config.features.register('staticAssets', true, true)

    app.register(require('@fastify/multipart'))

    app.addHook('preHandler', app.verifySession)
    app.addHook('preHandler', async (request, reply) => {
        if (request.params.projectId !== undefined) {
            if (request.params.projectId) {
                try {
                    request.project = await app.db.models.Project.byId(request.params.projectId)
                    if (!request.project) {
                        reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                        return
                    }
                    const teamType = await request.project.Team.getTeamType()
                    if (!teamType.getFeatureProperty('staticAssets', false)) {
                        reply.code(404).send({ code: 'not_found', error: 'Not Found - not available on team' })
                        return // eslint-disable-line no-useless-return
                    }
                    if (request.session.User) {
                        request.teamMembership = await request.session.User.getTeamMembership(request.project.Team.id)
                        if (!request.teamMembership && !request.session.User.admin) {
                            reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                            return // eslint-disable-line no-useless-return
                        }
                    } else if (request.session.ownerId !== request.params.projectId) {
                        // AccessToken being used - but not owned by this project
                        reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                        return // eslint-disable-line no-useless-return
                    }
                } catch (err) {
                    reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                }
            } else {
                reply.code(404).send({ code: 'not_found', error: 'Not Found' })
            }
        }
    })

    app.get('/_/*', {
        preHandler: app.needsPermission('project:files:list'),
        schema: {
            summary: 'List files stored in the instance',
            tags: ['Instance Files'],
            params: {
                type: 'object',
                properties: {
                    instanceId: { type: 'string' }
                }
            }
            // TODO: response format schema
        }
    }, async (request, reply) => {
        const rootPath = `/api/v1/projects/${request.project.id}/files/_/`
        let filePath = request.url.substring(rootPath.length)
        if (/\/$/.test(filePath)) {
            filePath = filePath.substring(0, filePath.length - 1)
        }
        try {
            const sharingConfig = await request.project.getSetting(KEY_SHARED_ASSETS) || {}
            const result = await app.containers.listFiles(request.project, filePath)
            result.files.forEach(file => {
                if (file.type === 'directory') {
                    const absolutePath = filePath + (filePath.length > 0 ? '/' : '') + file.name
                    if (sharingConfig[absolutePath]) {
                        file.share = sharingConfig[absolutePath]
                    }
                }
            })
            reply.send(result)
        } catch (err) {
            if (err.statusCode === 404) {
                reply.code(404).send({ code: 'not_found', error: 'Not Found' })
            } else {
                reply.code(400).send({ code: 'invalid_request', error: err.toString() })
            }
        }
    })

    app.put('/_/*', {
        preHandler: app.needsPermission('project:files:edit'),
        schema: {
            summary: 'Update file properties in the instance',
            tags: ['Instance Files'],
            params: {
                type: 'object',
                properties: {
                    instanceId: { type: 'string' }
                }
            },
            body: {
                type: 'object',
                properties: {
                    path: { type: 'string' },
                    share: { type: 'object', additionalProperties: true }
                }
            }
            // TODO: response format schema
        }
    }, async (request, reply) => {
        const rootPath = `/api/v1/projects/${request.project.id}/files/_/`
        let filePath = request.url.substring(rootPath.length)
        if (/\/$/.test(filePath)) {
            filePath = filePath.substring(0, filePath.length - 1)
        }
        const update = request.body

        if (update.path && update.share) {
            reply.code(400).send({ code: 'invalid_request', error: 'Cannot modify path and share in one request' })
            return
        }
        if (update.path) {
            try {
                const result = await app.containers.updateFile(request.project, filePath, update)
                reply.send(result)
            } catch (err) {
                if (err.statusCode === 404) {
                    reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                } else {
                    reply.code(400).send({ code: 'invalid_request', error: err.toString() })
                }
            }
        } else if (update.share) {
            // Need to validate this is a directory, not a file
            try {
                await app.containers.listFiles(request.project, filePath)
                // This is a valid directory so we can update the share details
                const sharingConfig = await request.project.getSetting(KEY_SHARED_ASSETS) || {}
                // TODO: validate contents of update.share
                sharingConfig[filePath] = update.share
                await request.project.updateSetting(KEY_SHARED_ASSETS, sharingConfig)
            } catch (err) {
                // Not a directory or 404
                reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                return
            }

            reply.code(200).send({})
        }
    })

    app.delete('/_/*', {
        preHandler: app.needsPermission('project:files:delete'),
        schema: {
            summary: 'Delete a file in the instance',
            tags: ['Instance Files'],
            params: {
                type: 'object',
                properties: {
                    instanceId: { type: 'string' }
                }
            }
            // TODO: response format schema
        }
    }, async (request, reply) => {
        const rootPath = `/api/v1/projects/${request.project.id}/files/_/`
        let filePath = request.url.substring(rootPath.length)
        if (/\/$/.test(filePath)) {
            filePath = filePath.substring(0, filePath.length - 1)
        }
        try {
            // Before we delete, we need to tidy up any share configs for dirs that
            // may be about to be deleted.
            try {
                // Try to get a dir listing - this will throw if filePath is a file or not found
                await app.containers.listFiles(request.project, filePath)
                // This is a directory. Tidy up shares
                const sharingConfig = await request.project.getSetting(KEY_SHARED_ASSETS) || {}
                let updatedSharingConfig = false
                const sharedPaths = Object.keys(sharingConfig)
                sharedPaths.forEach(sharedPath => {
                    if (sharedPath === filePath || sharedPath.startsWith(filePath + '/')) {
                        // This config is for the path to be deleted,
                        // or a directory beneath it
                        delete sharingConfig[sharedPath]
                        updatedSharingConfig = true
                    }
                })
                if (updatedSharingConfig) {
                    await request.project.updateSetting(KEY_SHARED_ASSETS, sharingConfig)
                }
            } catch (err) {
                // 404 or a file - not a directory that needs  let the request continue
            }
            const result = await app.containers.deleteFile(request.project, filePath)
            reply.send(result)
        } catch (err) {
            if (err.statusCode === 404) {
                reply.code(404).send({ code: 'not_found', error: 'Not Found' })
            } else {
                reply.code(400).send({ code: 'invalid_request', error: err.toString() })
            }
        }
    })

    app.post('/_/*', {
        preHandler: app.needsPermission('project:files:create'),
        schema: {
            summary: 'Upload a file to the instance/Create directory',
            tags: ['Instance Files'],
            params: {
                type: 'object',
                properties: {
                    instanceId: { type: 'string' }
                }
            }
            // TODO: response format schema
        }
    }, async (request, reply) => {
        const rootPath = `/api/v1/projects/${request.project.id}/files/_/`
        let filePath = request.url.substring(rootPath.length)
        if (/\/$/.test(filePath)) {
            filePath = filePath.substring(0, filePath.length - 1)
        }
        try {
            const contentType = request.headers['content-type']
            // Multipart == Upload
            if (/multipart\/form-data/.test(contentType)) {
                const data = await request.file()
                const buffer = await data.toBuffer()
                await app.containers.uploadFile(request.project, filePath, buffer)
            } else if (request.body?.path) {
                // Otherwise, application/json - create directory
                await app.containers.createDirectory(request.project, filePath, request.body?.path)
            } else {
                reply.code(400).send({ code: 'invalid_request', error: 'Missing body' })
                return
            }
        } catch (err) {
            if (err.statusCode === 404) {
                reply.code(404).send({ code: 'not_found', error: 'Not Found' })
            } else {
                reply.code(400).send({ code: 'invalid_request', error: err.toString() })
            }
            return
        }
        reply.send()
    })
}
