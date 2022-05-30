module.exports = {
    init: async (app, driver, options) => {
        this._driver = driver
        this._app = app
        this.options = options
        this.properties = {}
        if (driver.init) {
            this.properties = await this._driver.init(app, options)
        }
    },
    /**
     * Start a container.
     *
     *  - If Billing is enabled, this first checks the billing subscription and adds
     *    the project to the team subscription
     *  - Passes the request to the driver and returns without waiting for the
     *    driver to complete.
     *  - Returns an object that contains the driver's promise:
     *      { started: <driver promise> }
     *  - The driver promise is also watched so we can revert billing if needed should
     *    the create fail - and we put the project into suspended state
     *
     * @param {*} project The project to start
     * @returns {Promise} Resolves when the start request has been *accepted*.
     */
    start: async (project) => {
        if (this._app.license.active() && this._app.billing) {
            const subscription = await this._app.db.models.Subscription.byTeam(project.Team.id)
            if (subscription) {
                try {
                    await this._app.billing.addProject(project.Team, project)
                } catch (err) {
                    // Rethrow or wrap
                    throw new Error('Problem with setting up Billing')
                }
            } else {
                throw new Error('No Subscription for this team')
            }
        }
        const result = {}
        if (this._driver.start) {
            const startPromise = this._driver.start(project).catch(async err => {
                this._app.log.error(`Failed to start container ${project.id}: ${err.toString()}`)
                // The driver has failed to start this project for some reason
                project.state = 'suspended'
                await project.save()

                await this._app.db.controllers.AuditLog.projectLog(
                    project.id,
                    undefined,
                    'project.start.failed',
                    { error: err.toString() }
                )

                if (this._app.license.active() && this._app.billing) {
                    const subscription = await this._app.db.models.Subscription.byTeam(project.Team.id)
                    if (subscription) {
                        try {
                            await this._app.billing.removeProject(project.Team, project)
                        } catch (err) {
                            // Rethrow or wrap
                            throw new Error('Problem with setting up Billing')
                        }
                    } else {
                        throw new Error('No Subscription for this team')
                    }
                }
            })
            result.started = startPromise
        } else {
            result.started = Promise.resolve()
        }
        return result
    },

    /**
     * Stop a container.
     *
     * This is used when the container should be stopped, but the Project has
     * not been deleted. For example, the Stack is being modified, or the user
     * has asked to suspend the project.
     *
     * - This tells the driver to stop the container running. This places
     *   it into 'suspended' state. It *could* be restarted later, so the container
     *   may choose to keep some state in place.
     *
     * - If billing is enabled (and the project isn't already in suspended state)
     *   it is removed from the subscription
     *
     * @param {*} project The project to stop
     * @returns {Promise} Resolves when the project has been stopped
     */

    stop: async (project) => {
        if (project.state === 'suspended') {
            // Already in the right state, nothing to do
            return
        }
        project.state = 'suspended'
        await project.save()
        if (this._driver.stop) {
            await this._driver.stop(project)
        }
        if (this._app.license.active() && this._app.billing) {
            const subscription = await this._app.db.models.Subscription.byTeam(project.Team.id)
            if (subscription) {
                try {
                    await this._app.billing.removeProject(project.Team, project)
                } catch (err) {
                    // Rethrow or wrap?
                    throw new Error('Problem with removing project from subscription')
                }
            } else {
                throw new Error('No Subscription for this team')
            }
        }
    },

    /**
     * Remove a container entirely
     *
     * This is used when a Project is being deleted.
     *
     * - This tells the driver to stop the container running (if it hasn't
     *   already been stopped ('suspended' state)) and remove any/all resources
     *   it has been allocated.
     *
     * - If billing is enabled (and the project isn't already in suspended state)
     *   it is removed from the subscription
     *
     * @param {*} project The project to remove
     * @returns {Promise} Resolves when the project has been stopped
     */
    remove: async (project) => {
        if (this._driver.remove) {
            await this._driver.remove(project)
        }
        if (project.state !== 'suspended') {
            // Only updated billing if the project isn't already suspended
            if (this._app.license.active() && this._app.billing) {
                const subscription = this._app.db.models.Subscription.byTeam(project.Team.id)
                if (subscription) {
                    try {
                        await this._app.billing.removeProject(project.Team, project)
                    } catch (err) {
                        // Rethrow or wrap?
                        throw new Error('Problem with removing project from subscription')
                    }
                } else {
                    throw new Error('No Subscription for this team')
                }
            }
        }
    },
    details: async (project) => {
        let value = {}
        if (this._driver.details) {
            value = await this._driver.details(project)
        }
        return value
    },
    settings: async (project) => {
        let value = {}
        if (this._driver.settings) {
            value = await this._driver.settings(project)
        }
        return value
    },
    startFlows: async (project, options) => {
        if (this._driver.startFlows) {
            await this._driver.startFlows(project, options)
        }
    },
    stopFlows: async (project) => {
        if (this._driver.stopFlows) {
            await this._driver.stopFlows(project)
        }
    },
    restartFlows: async (project, options) => {
        if (this._driver.restartFlows) {
            this._driver.restartFlows(project, options)
        }
    },
    logoutNodeRED: async (project, token) => { // logout:nodered(step-2)
        if (this._driver.logoutNodeRED) {
            await this._driver.logoutNodeRED(project, token) // logout:nodered(step-3)
        }
    },
    logs: async (project) => {
        let value = []
        if (this._driver.logs) {
            value = await this._driver.logs(project)
        }
        return value
    },
    shutdown: async () => {
        if (this._driver.shutdown) {
            await this._driver.shutdown()
        }
    },
    properties: () => this.properties
}
