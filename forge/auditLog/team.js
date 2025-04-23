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
            async suspended (actionedBy, error, team) {
                await log('team.suspended', actionedBy, team?.id, generateBody({ error, team }))
            },
            async unsuspended (actionedBy, error, team) {
                await log('team.unsuspended', actionedBy, team?.id, generateBody({ error, team }))
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
                async reInvited (actionedBy, error, team, user, role) {
                    const body = generateBody({ error, user, role })
                    await log('team.user.invite-resent', actionedBy, team?.id, body)
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
            type: {
                async changed (actionedBy, error, team, info) {
                    await log('team.type.changed', actionedBy, team.id, generateBody({ error, team, info }))
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
                async bulkDeleted (actionedBy, error, team, devices) {
                    const info = { count: devices.length }
                    await log('team.device.bulk-deleted', actionedBy, team?.id, generateBody({ error, info }))
                },
                async updated (actionedBy, error, team, device, updates) {
                    await log('team.device.updated', actionedBy, team?.id, generateBody({ error, device, updates }))
                },
                async unassigned (actionedBy, error, team, projectOrApplication, device) {
                    const bodyData = { error, device }
                    if (device.isApplicationOwned || projectOrApplication?.constructor?.name === 'Application') {
                        bodyData.application = projectOrApplication
                    } else {
                        bodyData.project = projectOrApplication
                    }
                    await log('team.device.unassigned', actionedBy, team?.id, generateBody(bodyData))
                },
                async assigned (actionedBy, error, team, projectOrApplication, device) {
                    const bodyData = { error, device }
                    if (device.isApplicationOwned || projectOrApplication?.constructor?.name === 'Application') {
                        bodyData.application = projectOrApplication
                    } else {
                        bodyData.project = projectOrApplication
                    }
                    await log('team.device.assigned', actionedBy, team?.id, generateBody(bodyData))
                },
                async credentialsGenerated (actionedBy, error, team, device) {
                    await log('team.device.credentials-generated', actionedBy, team?.id, generateBody({ error, device }))
                },
                provisioning: {
                    async created (actionedBy, error, tokenId, tokenName, team, application, project) {
                        const info = { tokenId, tokenName }
                        await log('team.device.provisioning.created', actionedBy, team?.id, generateBody({ error, application, project, info }))
                    },
                    async updated (actionedBy, error, tokenId, tokenName, team, updates) {
                        const info = { tokenId, tokenName }
                        await log('team.device.provisioning.updated', actionedBy, team?.id, generateBody({ error, updates, info }))
                    },
                    async deleted (actionedBy, error, tokenId, tokenName, team) {
                        const info = { tokenId, tokenName }
                        await log('team.device.provisioning.deleted', actionedBy, team?.id, generateBody({ error, info }))
                    }
                },
                developerMode: {
                    async enabled (actionedBy, error, team, device) {
                        await log('team.device.developer-mode.enabled', actionedBy, team?.id, generateBody({ error, device }))
                    },
                    async disabled (actionedBy, error, team, device) {
                        await log('team.device.developer-mode.disabled', actionedBy, team?.id, generateBody({ error, device }))
                    }
                },
                remoteAccess: {
                    async enabled (actionedBy, error, team, device) {
                        await log('team.device.remote-access.enabled', actionedBy, team?.id, generateBody({ error, device }))
                    },
                    async disabled (actionedBy, error, team, device) {
                        await log('team.device.remote-access.disabled', actionedBy, team?.id, generateBody({ error, device }))
                    }
                }
            },
            package: {
                async published (actionedBy, error, team, pkg) {
                    await log('team.package.published', actionedBy, team?.id, generateBody({ error, pkg }))
                },
                async unpublished (actionedBy, error, team, pkg) {
                    await log('team.package.unpublished', actionedBy, team?.id, generateBody({ error, pkg }))
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

        const application = {
            async created (actionedBy, error, team, application) {
                await log('application.created', actionedBy, team?.id, generateBody({ error, team, application }))
            },
            async updated (actionedBy, error, team, application, updates) {
                await log('application.updated', actionedBy, team?.id, generateBody({ error, team, application, updates }))
            },
            async deleted (actionedBy, error, team, application) {
                await log('application.deleted', actionedBy, team?.id, generateBody({ error, team, application }))
            },
            pipeline: {
                async created (actionedBy, error, team, application, pipeline) {
                    await log('application.pipeline.created', actionedBy, team?.id, generateBody({ error, team, application, pipeline }))
                },
                async updated (actionedBy, error, team, application, pipeline, updates) {
                    await log('application.pipeline.updated', actionedBy, team?.id, generateBody({ error, team, application, pipeline, updates }))
                },
                async deleted (actionedBy, error, team, application, pipeline) {
                    await log('application.pipeline.deleted', actionedBy, team?.id, generateBody({ error, team, application, pipeline }))
                },
                async stageAdded (actionedBy, error, team, application, pipeline, pipelineStage) {
                    await log('application.pipeline.stage-added', actionedBy, team?.id, generateBody({ error, team, application, pipeline, pipelineStage }))
                },
                async stageDeployed (actionedBy, error, team, application, pipeline, sourcePipelineStage, targetPipelineStage) {
                    await log('application.pipeline.stage-deployed', actionedBy, team?.id, generateBody({ error, team, application, pipeline, pipelineStage: sourcePipelineStage, pipelineStageTarget: targetPipelineStage }))
                }
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
                async updated (actionedBy, error, team, subscription, updates) {
                    const body = generateBody({ error, team, subscription, updates })
                    await log('billing.subscription.updated', actionedBy, team?.id, body)
                },
                async deleted (actionedBy, error, team, subscription) {
                    const body = generateBody({ error, team, subscription })
                    await log('billing.subscription.deleted', actionedBy, team?.id, body)
                },
                async creditApplied (actionedBy, error, team, subscription, amount) {
                    const updates = [{ key: 'credit', new: amount }]
                    const body = generateBody({ error, team, subscription, updates })
                    await log('billing.subscription.credit-applied', actionedBy, team?.id, body)
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
            application,
            project,
            billing
        }
    }
}
