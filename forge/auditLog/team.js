const { projectObject, generateBody, triggerObject } = require('./formatters')

// Audit Logging of team scoped events
module.exports = {
    getLoggers (app) {
        const team = {
            async created (actionedBy, error, team) {
                await log('team.created', actionedBy, team?.id, generateBody({ error, team }))
            },
            async deleted (actionedBy, error, team) {
                await log('team.deleted', actionedBy, team?.id, generateBody({ error, team }))
            },
            user: {
                async added (actionedBy, error, team, user) {
                    const body = generateBody({ error, user })
                    await log('team.user.added', actionedBy, team?.id, body)
                },
                async removed (actionedBy, error, team, user) {
                    const body = generateBody({ error, user })
                    await log('team.user.removed', actionedBy, team?.id, body)
                },
                async invited (actionedBy, error, team, user, role) {
                    const body = generateBody({ error, user, role })
                    await log('team.user.invited', actionedBy, team?.id, body)
                },
                async uninvited (actionedBy, error, team, user, role) {
                    const body = generateBody({ error, user, role })
                    await log('team.user.uninvited', actionedBy, team?.id, body)
                },
                invite: {
                    async accepted (actionedBy, error, team, user, role) {
                        await log('team.user.invite.accepted', actionedBy, team?.id, generateBody({ error, user, role }))
                    },
                    async rejected (actionedBy, error, team, user, role) {
                        await log('team.user.invite.rejected', actionedBy, team?.id, generateBody({ error, user, role }))
                    }
                },
                async roleChanged (actionedBy, error, team, user, updates) {
                    await log('team.user.role-changed', actionedBy, team?.id, generateBody({ error, user, updates }))
                }
            },
            settings: {
                async updated (actionedBy, error, team, updates) {
                    await log('team.settings.updated', actionedBy, team?.id, generateBody({ error, team, updates }))
                }
            },
            device: {
                async created (actionedBy, error, team, device) {
                    await log('team.device.created', actionedBy, team?.id, generateBody({ error, device }))
                },
                async deleted (actionedBy, error, team, device) {
                    await log('team.device.deleted', actionedBy, team?.id, generateBody({ error, device }))
                },
                async updated (actionedBy, error, team, device, updates) {
                    await log('team.device.updated', actionedBy, team?.id, generateBody({ error, device, updates }))
                },
                async unassigned (actionedBy, error, team, project, device) {
                    await log('team.device.unassigned', actionedBy, team?.id, generateBody({ error, project, device }))
                },
                async assigned (actionedBy, error, team, project, device) {
                    await log('team.device.assigned', actionedBy, team?.id, generateBody({ error, project, device }))
                },
                async credentialsGenerated (actionedBy, error, team, device) {
                    await log('team.device.credentials-generated', actionedBy, team?.id, generateBody({ error, device }))
                }
            }
        }

        const project = {
            async duplicated (actionedBy, error, team, sourceProject, newProject) {
                const body = generateBody({ error, project: newProject })
                body.sourceProject = projectObject(sourceProject)
                await log('project.duplicated', actionedBy, team?.id, body)
            },
            async created (actionedBy, error, team, project) {
                await log('project.created', actionedBy, team?.id, generateBody({ error, team, project }))
            },
            async deleted (actionedBy, error, team, project) {
                await log('project.deleted', actionedBy, team?.id, generateBody({ error, team, project }))
            }
        }

        const billing = {
            session: {
                async created (actionedBy, error, team, billingSession) {
                    const body = generateBody({ error, team, billingSession })
                    await log('billing.session.created', actionedBy, team?.id, body)
                },
                async completed (actionedBy, error, team, billingSession) {
                    const body = generateBody({ error, team, billingSession })
                    await log('billing.session.completed', actionedBy, team?.id, body)
                }
            },
            subscription: {
                async deleted (actionedBy, error, team, subscription) {
                    const body = generateBody({ error, team })
                    body.subscription = { subscription: subscription.subscription }
                    await log('billing.subscription.deleted', actionedBy, team?.id, body)
                }
            }
        }

        const log = async (event, actionedBy, teamId, body) => {
            try {
                const trigger = triggerObject(actionedBy)
                let whoDidIt = trigger?.id
                if (typeof whoDidIt !== 'number' || whoDidIt <= 0) {
                    whoDidIt = null
                    body.trigger = trigger
                }
                await app.db.controllers.AuditLog.teamLog(teamId, whoDidIt, event, body)
            } catch (error) {
                console.warn('Failed to log team scope audit event', event, error)
            }
        }
        return {
            team,
            project,
            billing
        }
    }
}
