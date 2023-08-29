module.exports = async function (app) {
    app.addHook('preHandler', app.verifySession)
    app.addHook('preHandler', async (request, reply) => {
        if (!app.config.features.enabled('ha')) {
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
                    if (!teamType.getFeatureProperty('ha', true)) {
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
                        // AccesToken being used - but not owned by this project
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

    app.get('/', {
        preHandler: app.needsPermission('project:read')
    }, async (request, reply) => {
        reply.send(await request.project.getHASettings() || {})
    })

    app.put('/', {
        preHandler: app.needsPermission('project:edit')
    }, async (request, reply) => {
        // For 1.8, only support setting replica count to 2
        if (request.body.replicas !== 2) {
            reply.code(409).send({ code: 'invalid_ha_configuration', error: 'Invalid HA configuration -only 2 replicas are allowed' })
            return
        }
        const existingHA = await request.project.getHASettings() || {}
        if (existingHA.replicas !== request.body.replicas) {
            // This is a change in replica count.
            await request.project.updateHASettings({ replicas: request.body.replicas })
            await applyUpdatedInstanceSettings(reply, request.project, request.session.User)
        } else {
            reply.send(await request.project.getHASettings() || {})
        }
    })

    app.delete('/', {
        preHandler: app.needsPermission('project:edit')
    }, async (request, reply) => {
        const existingHA = await request.project.getHASettings() || {}
        if (existingHA.replicas) {
            // This instance already has ha configured - clear the setting
            // and apply
            await request.project.updateHASettings(undefined)
            await applyUpdatedInstanceSettings(reply, request.project, request.session.User)
        } else {
            reply.send({})
        }
    })

    async function applyUpdatedInstanceSettings (reply, project, user) {
        if (project.state !== 'suspended') {
            // This code is copy/paste with slight changes from projects.js
            // We also have projectActions.js that does suspend logic.
            // TODO: refactor into a Model function to suspend a project
            app.db.controllers.Project.setInflightState(project, 'starting') // TODO: better inflight state needed
            reply.send(await project.getHASettings() || {})

            const targetState = project.state
            app.log.info(`Stopping project ${project.id}`)
            await app.containers.stop(project, {
                skipBilling: true
            })
            await app.auditLog.Project.project.suspended(user, null, project)
            app.log.info(`Restarting project ${project.id}`)
            project.state = targetState
            await project.save()
            await project.reload()
            const startResult = await app.containers.start(project)
            startResult.started.then(async () => {
                await app.auditLog.Project.project.started(user, null, project)
                app.db.controllers.Project.clearInflightState(project)
                return true
            }).catch(_ => {
                app.db.controllers.Project.clearInflightState(project)
            })
        } else {
            // A suspended project doesn't need to do anything more
            // The settings will get applied when it is next resumed
            reply.send(await project.getHASettings() || {})
        }
    }
}
