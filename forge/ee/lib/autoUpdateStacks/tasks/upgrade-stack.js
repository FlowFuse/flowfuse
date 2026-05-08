/**
 * If there is an upgrade for a Stack apply it
 */

const { randomInt } = require('../../../../housekeeper/utils')

// utility function to pause for a given number of ms
const delay = (time) => new Promise(resolve => setTimeout(resolve, time))

module.exports = {
    name: 'stackUpgrade',
    // startup: false
    startup: 45000,
    schedule: `${randomInt(0, 29)} * * * *`, // random time in first half of hour
    run: async function (app) {
        if (app.config.features.enabled('autoStackUpdate')) {
            const date = new Date()
            const hour = date.getUTCHours()
            const day = date.getUTCDay()
            app.log.info(`Starting Stack Upgrade/Restart Check, hour: ${hour} day: ${day}`)
            const projectList = await app.db.models.ProjectSettings.getProjectsToUpgrade(hour, day)
            if (projectList) {
                for (const project of projectList) {
                    if (project.Project.state !== 'suspended') {
                        if (project.Project.ProjectStack.replacedBy) {
                            // need to add audit logging
                            try {
                                const newStack = await project.Project.ProjectStack.findLatestStack()
                                app.log.info(`Updating project ${project.Project.id} to stack: '${newStack.hashid}'`)

                                const suspendOptions = {
                                    skipBilling: true
                                }

                                app.db.controllers.Project.setInflightState(project.Project, 'starting')
                                const result = await suspendProject(project.Project, suspendOptions)

                                await project.Project.setProjectStack(newStack)
                                await project.Project.save()
                                // Give time for k8s to settle after suspend
                                await delay(2000)

                                await app.auditLog.Project.project.stack.changed(null, null, project.Project, newStack)

                                await unSuspendProject(project.Project, result.resumeProject, result.targetState)
                                // Space out restarts a little to not overwhelm k8s api
                                await delay(2000)
                            } catch (err) {
                                console.log(err)
                                app.log.info(`Problem updating project ${project.Project.id} - ${err.toString()}`)
                            }
                        } else if (project.value.restart) {
                            try {
                                app.log.info(`Restarting project ${project.Project.id} as scheduled`)
                                await app.db.controllers.Project.setInflightState(project.Project, 'restarting')
                                project.Project.state = 'running'
                                await project.Project.save()
                                await app.containers.restartFlows(project.Project)
                                await app.auditLog.Project.project.restarted(null, null, project.Project)
                                await app.db.controllers.Project.clearInflightState(project.Project)
                                // space out the Node-RED restarts a little.
                                await delay(2000)
                            } catch (err) {
                                app.log.info(`Problem restarting project ${project.Project.id} - ${err.toString()}`)
                            }
                        }
                    } else {
                        app.log.info(`Project ${project.Project.id} is suspended, not upgrading stack`)
                    }
                }
            }
            app.log.info('Ending Stack Upgrade Check')
        }

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
