// Audit Logging of team scoped events

let app

const { teamLog } = require('../../db/controllers/AuditLog')
const { projectObject, generateBody, triggerObject } = require('./formatters')

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
            async accept (actionedBy, error, team, user, role) {
                await log('team.user.invite.accept', actionedBy, team?.id, generateBody({ error, user, role }))
            },
            async reject (actionedBy, error, team, user, role) {
                await log('team.user.invite.reject', actionedBy, team?.id, generateBody({ error, user, role }))
            }
        },
        rollChanged (actionedBy, error, team, user, updates) {
            log('team.user.roleChanged', actionedBy, team?.id, generateBody({ error, user, updates }))
        }
    },
    settings: {
        async update (actionedBy, error, team, updates) {
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
        async credentialsGenerated (actionedBy, error, team, project, device) {
            await log('team.device.credentialsGenerated', actionedBy, team?.id, generateBody({ error, project, device }))
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
    const trigger = triggerObject(actionedBy)
    if (typeof trigger?.id === 'number' && trigger?.id <= 0) {
        body.trigger = trigger // store trigger in body since it's not a real user
        await teamLog(app, teamId, null, event, body)
    } else {
        await teamLog(app, teamId, trigger.id, event, body)
    }
}

module.exports = {
    getLoggers (_app) {
        app = _app
        return {
            team,
            project,
            billing
        }
    }
}
