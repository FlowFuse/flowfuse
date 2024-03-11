const { generateBody, triggerObject } = require('./formatters')
// Audit Logging of project scoped events

module.exports = {
    getLoggers (app) {
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
            async startFailed (actionedBy, error, project) {
                await log('project.start-failed', actionedBy || 0, project?.id, generateBody({ error }))
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
            async copied (actionedBy, error, project, targetProject) {
                await log('project.copied', actionedBy, project?.id, generateBody({ error, project, targetProject }))
            },
            async imported (actionedBy, error, project, sourceProject, sourceDevice) {
                await log('project.imported', actionedBy, project?.id, generateBody({ error, project, sourceProject, sourceDevice }))
            },
            async flowImported (actionedBy, error, project) {
                await log('project.flow-imported', actionedBy, project?.id, generateBody({ error, project }))
            },
            async assignedToPipelineStage (actionedBy, error, project, pipeline, pipelineStage) {
                await log('project.assigned-to-pipeline-stage', actionedBy, project?.id, generateBody({ error, project, pipeline, pipelineStage }))
            },
            async protected (actionedBy, error, project) {
                await log('project.protected', actionedBy, project?.id, generateBody({ error, project }))
            },
            async unprotected (actionedBy, error, project) {
                await log('project.unprotected', actionedBy, project?.id, generateBody({ error, project }))
            },
            device: {
                async unassigned (actionedBy, error, project, device) {
                    await log('project.device.unassigned', actionedBy, project?.id, generateBody({ error, project, device }))
                },
                async assigned (actionedBy, error, project, device) {
                    await log('project.device.assigned', actionedBy, project?.id, generateBody({ error, project, device }))
                },
                snapshot: {
                    async created (actionedBy, error, project, device, snapshot) {
                        await log('project.device.snapshot.created', actionedBy, project?.id, generateBody({ error, project, device, snapshot }))
                    }
                }
            },
            type: {
                async changed (actionedBy, error, project, projectType) {
                    await log('project.type.changed', actionedBy, project?.id, generateBody({ error, project, projectType }))
                }
            },
            stack: {
                async changed (actionedBy, error, project, stack) {
                    await log('project.stack.changed', actionedBy, project?.id, generateBody({ error, project, stack }))
                },
                async restart (actionedBy, error, project) {
                    await log('project.stack.restart', actionedBy, project?.id, generateBody({ error, project }))
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
                async rolledBack (actionedBy, error, project, snapshot) {
                    await log('project.snapshot.rolled-back', actionedBy, project?.id, generateBody({ error, project, snapshot }))
                },
                async deleted (actionedBy, error, project, snapshot) {
                    await log('project.snapshot.deleted', actionedBy, project?.id, generateBody({ error, project, snapshot }))
                },
                async deviceTargetSet (actionedBy, error, project, snapshot) {
                    await log('project.snapshot.device-target-set', actionedBy, project?.id, generateBody({ error, project, snapshot }))
                },
                async imported (actionedBy, error, project, sourceProject, sourceDevice, snapshot) {
                    await log('project.snapshot.imported', actionedBy, project?.id, generateBody({ error, project, sourceProject, sourceDevice, snapshot }))
                },
                async exported (actionedBy, error, project, snapshot) {
                    await log('project.snapshot.exported', actionedBy, project?.id, generateBody({ error, project, snapshot }))
                }
            },
            httpToken: {
                async created (actionedBy, error, project, token) {
                    await log('project.httpToken.created', actionedBy, project?.id, generateBody({ error, project, token }))
                },
                async updated (actionedBy, error, project, updates) {
                    await log('project.httpToken.updated', actionedBy, project?.id, generateBody({ error, project, updates }))
                },
                async deleted (actionedBy, error, project, token) {
                    await log('project.httpToken.deleted', actionedBy, project?.id, generateBody({ error, project, token }))
                }
            }
        }

        const log = async (event, actionedBy, projectId, body) => {
            try {
                const trigger = triggerObject(actionedBy)
                let whoDidIt = trigger.id
                if (typeof trigger.id !== 'number' || trigger.id <= 0) {
                    whoDidIt = null
                    body.trigger = trigger
                }
                await app.db.controllers.AuditLog.projectLog(projectId, whoDidIt, event, body)
            } catch (error) {
                console.warn('Failed to log project scope audit event', event, error)
            }
        }
        return {
            project
        }
    }
}
