/**
 * If there is an upgrade for a Stack apply it
 */

const { randomInt } = require('../utils')

module.exports = {
    name: 'stackUpgrade',
    // startup: false
    startup: 45000,
    schedule: `${randomInt(0, 29)} * * * *`, // random time in first half of hour
    run: async function (app) {
        const date = new Date()
        const hour = date.getUTCHours()
        const day = date.getUTCDay()
        app.log.info(`Starting Stack Upgrade Check, hour: ${hour} day: ${day}`)
        const projectList = await app.db.models.ProjectSettings.upgradeStack(hour, day)
        if (projectList) {
            for (const project of projectList) {
                // we should probably rate limit this to not restart lots of projects at once
                if (project.Project.ProjectStack.replacedBy) {
                    // need to add audit logging
                    try {
                        const newStack = await app.db.models.ProjectStack.byId(project.Project.ProjectStack.replacedBy)
                        app.log.info(`Updating project ${project.Project.id} to  stack: '${newStack.hashid}'`)

                        const suspendOptions = {
                            skipBilling: true
                        }

                        app.db.controllers.Project.setInflightState(project.Project, 'starting')
                        const result = await suspendProject(project.Project, suspendOptions)

                        await project.Project.setProjectStack(newStack)
                        await project.Project.save()

                        await app.auditLog.Project.project.stack.changed(null, null, project.Project, newStack)

                        await unSuspendProject(project.Project, result.resumeProject, result.targetState)
                    } catch (err) {
                        app.log.info(`Problem updating project ${project.Project.id} - ${err.toString()}`)
                    }
                } else {
                    // no upgrade)
                }
            }
        }
        app.log.info('Ending Stack Upgrade Check')

        async function suspendProject (project, options) {
            let resumeProject = false
            const targetState = project.state
            if (project.state !== 'suspended') {
                resumeProject = true
                app.log.info(`Stopping project ${project.id}`)
                await app.containers.stop(project, options)
                await app.auditLog.Project.project.suspended(null, null, project)
            }
            return { resumeProject, targetState }
        }

        async function unSuspendProject (project, resumeProject, targetState) {
            if (resumeProject) {
                app.log.info(`Restarting project ${project.id}`)
                project.state = targetState
                await project.save()
                // Ensure the project has the full stack object
                await project.reload()
                const startResult = await app.containers.start(project)
                startResult.started.then(async () => {
                    await app.auditLog.Project.project.started(null, null, project)
                    app.db.controllers.Project.clearInflightState(project)
                    return true
                }).catch(err => {
                    app.log.info(`Failed to restart project ${project.id}`)
                    throw err
                })
            } else {
                app.db.controllers.Project.clearInflightState(project)
            }
        }
    }
}
