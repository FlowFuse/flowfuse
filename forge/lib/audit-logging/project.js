// Audit Logging of project scoped events

let app
const { generateBody, triggerObject } = require('./formatters')

const project = {
    async created (actionedBy, error, team, project) {
        await log('project.created', actionedBy, project?.id, generateBody({ error, team, project }))
    },
    async deleted (actionedBy, error, team, project) {
        await log('project.deleted', actionedBy, project?.id, generateBody({ error, team, project }))
    },
    async started (actionedBy, error, project) {
        await log('project.started', actionedBy, project?.id, generateBody({ error, project }))
    },
    async stopped (actionedBy, error, project) {
        await log('project.stopped', actionedBy, project?.id, generateBody({ error, project }))
    },
    async restarted (actionedBy, error, project) {
        await log('project.restarted', actionedBy, project?.id, generateBody({ error, project }))
    },
    async suspended (actionedBy, error, project) {
        await log('project.suspended', actionedBy, project?.id, generateBody({ error, project }))
    },
    async flowImported (actionedBy, error, project) {
        await log('project.flow-imported', actionedBy, project?.id, generateBody({ error, project }))
    },
    device: {
        async unassigned (actionedBy, error, project, device) {
            await log('project.device.unassigned', actionedBy, project?.id, generateBody({ error, project, device }))
        },
        async assigned (actionedBy, error, project, device) {
            await log('project.device.assigned', actionedBy, project?.id, generateBody({ error, project, device }))
        }
    },
    stack: {
        async changed (actionedBy, error, team, project, stack) {
            await log('project.stack.changed', actionedBy, project?.id, generateBody({ error, team, project, stack }))
        }
    },
    settings: {
        async updated (actionedBy, error, project, updates) {
            await log('project.settings.updated', actionedBy, project?.id, generateBody({ error, project, updates }))
        }
    },
    snapshot: {
        async created (actionedBy, error, project, snapshot) {
            await log('project.snapshot.created', actionedBy, project?.id, generateBody({ error, project, snapshot }))
        },
        async rollback (actionedBy, error, project, snapshot) {
            await log('project.snapshot.rollback', actionedBy, project?.id, generateBody({ error, project, snapshot }))
        },
        async deleted (actionedBy, error, project, snapshot) {
            await log('project.snapshot.deleted', actionedBy, project?.id, generateBody({ error, project, snapshot }))
        },
        async deviceTargetSet (actionedBy, error, project, snapshot) {
            await log('project.snapshot.device-target-set', actionedBy, project?.id, generateBody({ error, project, snapshot }))
        }
    }
}

const log = async (event, actionedBy, projectId, body) => {
    const trigger = triggerObject(actionedBy)
    await app.db.controllers.AuditLog.projectLog(app, projectId, trigger.id, event, body)
}

module.exports = {
    getLoggers (_app) {
        app = _app
        return {
            project
        }
    }
}
