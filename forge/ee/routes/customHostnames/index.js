const dns = require('dns/promises')

const { KEY_CUSTOM_HOSTNAME } = require('../../../db/models/ProjectSettings')

module.exports = async function (app) {
    app.addHook('preHandler', app.verifySession)
    app.addHook('preHandler', async (request, reply) => {
        if (!app.config.features.enabled('customHostnames')) {
            reply.code(404).send({ code: 'not_found', error: 'Not Found' })
        }
    })
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
                    if (!teamType.getFeatureProperty('customHostnames', true)) {
                        reply.code(404).send({ code: 'not_found', error: 'Not Found' })
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

    app.get('/status', {
        preHandler: app.needsPermission('project:edit')
    }, async (request, reply) => {
        const hostname = await request.project.getSetting(KEY_CUSTOM_HOSTNAME)
        const cname = app.config.driver.options?.customHostname?.cnameTarget
        if (cname && hostname) {
            // let found = false
            try {
                const targets = await dns.resolveCname(hostname)
                if (targets.includes(cname)) {
                    reply.code(200).send({})
                    return
                }
            } catch (err) {
                // found = false
            }
            reply.code(410).send({ code: 'domain_not_valid', error: 'CNAME not found' })
        }
        reply.code(404).send({ code: 'not_found', error: 'Not Found' })
    })

    app.get('/', {
        preHandler: app.needsPermission('project:edit')
    }, async (request, reply) => {
        reply.send(await request.project.getCustomHostname() || {})
    })

    app.put('/', {
        preHandler: app.needsPermission('project:edit')
    }, async (request, reply) => {
        app.log.debug(`custom hostname put ${JSON.stringify(request.body)}`)
        if (request.body.hostname) {
            try {
                await request.project.setCustomHostname(request.body.hostname)
                app.db.controllers.Project.setInflightState(request.project, 'starting')
                restartInstance(request.project, request.session.User)
                reply.send(await request.project.getCustomHostname() || {})
            } catch (err) {
                reply.code(409).send({ code: 'hostname_not_available', error: 'Hostname not available' })
            }
        } else {
            reply.code(400).send({})
        }
    })

    app.delete('/', {
        preHandler: app.needsPermission('project:edit')
    }, async (request, reply) => {
        await request.project.clearCustomHostname()
        app.db.controllers.Project.setInflightState(request.project, 'starting')
        await restartInstance(request.project, request.session.User)
        reply.status(204).send({})
    })

    async function restartInstance (project, user) {
        if (project.state === 'running') {
            app.log.info(`Restarting project ${project.id}`)
            await app.containers.stop(project, { skipBilling: true })
            await app.auditLog.Project.project.suspended(user, null, project)
            project.state = 'running'
            await project.save()
            await project.reload()
            const startResult = await app.containers.start(project)
            startResult.started.then(async () => {
                await app.auditLog.Project.project.started(user, null, project)
                app.db.controllers.Project.clearInflightState(project)
                return true
            }).catch(err => {
                app.log.info(`Failed to restart project ${project.id}`)
                throw err
            })
        }
    }
}
