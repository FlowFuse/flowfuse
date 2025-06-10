class SubscriptionHandler {
    constructor (app) {
        this._app = app
    }

    async addProject (project) {
        // This will perform all checks needed to ensure this instance
        // can be started - throws err if not
        await project.Team.checkInstanceStartAllowed(project)

        try {
            this._app.log.info(`Adding instance '${project.id}' to team ${project.Team.hashid} subscription'`)
            await this._app.billing.addProject(project.Team, project)
        } catch (err) {
            this._app.log.error(`Problem adding project to subscription: ${err}`)
            throw new Error('Problem adding project to subscription')
        }
    }

    /**
     * Removes a project from the project teams billing subscription
     * If the `skipBilling` option is set, the change is not sent to Stripe, leaving the project in billed state
     * this can be used to stop & restart the project without triggering Stripe events
     * @param {*} project
     * @param {*} options
     */
    async removeProject (project, { skipBilling = false } = {}) {
        if (!skipBilling) {
            this._app.log.info(`Removing instance '${project.id}' from team ${project.Team.hashid} subscription'`)
            try {
                await this._app.billing.removeProject(project.Team, project)
            } catch (err) {
                this._app.log.error(`Problem removing project from subscription: ${err}`)
                throw new Error('Problem with removing project from subscription')
            }
        }
    }
}

module.exports = {
    init: async (app, driver, options) => {
        this._driver = driver
        this._app = app
        this.options = options
        this.properties = {}
        if (driver.init) {
            this.properties = await this._driver.init(app, options)
        }
        this._subscriptionHandler = new SubscriptionHandler(app)
        this._isBillingEnabled = () => {
            return app.license.active() && !!app.billing
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
        if (this._app.license.active() && this._app.license.status().expired) {
            this._app.log.error({
                code: 'license_expired',
                error: `Failed to start project ${project.id}: License expired`
            })
            project.state = 'suspended'
            await project.save()
            throw new Error('License Expired')
        }

        if (this._isBillingEnabled()) {
            await this._subscriptionHandler.addProject(project)
        }

        const result = {}
        if (this._driver.start) {
            const startPromise = this._driver.start(project).catch(async err => {
                // The driver has failed to start this project for some reason
                const errorDetail = {
                    code: err.code || 'unexpected_error',
                    error: `Failed to start project ${project.id}: ${err.toString()}`,
                    stack: err.stack
                }
                this._app.log.error(errorDetail.error)
                await this._app.auditLog.Project.project.startFailed(0 /* system */, errorDetail, project)

                // Update the project state to suspended
                project.state = 'suspended'
                await project.save()

                // If billing is enabled, remove the project from the subscription
                if (this._isBillingEnabled()) {
                    await this._subscriptionHandler.removeProject(project)
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
     * @param {Object} options Config options when stopping
     * @returns {Promise} Resolves when the project has been stopped
     */

    stop: async (project, options = {}) => {
        if (project.state === 'suspended') {
            // Already in the right state, nothing to do
            return
        }
        project.state = 'suspended'
        await project.save()
        if (this._driver.stop) {
            await this._driver.stop(project)
        }

        if (this._isBillingEnabled()) {
            await this._subscriptionHandler.removeProject(project, options)
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
            // Update state so it gets removed from the billing counts
            project.state = 'deleting'
            await project.save()
            // Only updated billing if the project isn't already suspended
            if (this._isBillingEnabled()) {
                await this._subscriptionHandler.removeProject(project)
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
        // This will perform all checks needed to ensure this instance
        // can be started - throws err if not
        await project.Team.checkInstanceStartAllowed(project)

        if (this._driver.startFlows) {
            await this._driver.startFlows(project, options)
        }
    },
    stopFlows: async (project) => {
        // Always allows flows to be stopped regardless of billing state
        if (this._driver.stopFlows) {
            await this._driver.stopFlows(project)
        }
    },
    restartFlows: async (project, options) => {
        // This will perform all checks needed to ensure this instance
        // can be started - throws err if not
        await project.Team.checkInstanceStartAllowed(project)

        if (this._driver.restartFlows) {
            await this._driver.restartFlows(project, options)
        }
    },
    revokeUserToken: async (project, token) => { // logout:nodered(step-2)
        if (this._driver.revokeUserToken) {
            if (project.state === 'suspended') {
                return
            }
            await this._driver.revokeUserToken(project, token) // logout:nodered(step-3)
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
    getDefaultStackProperties: () => {
        let value = {}
        if (this._driver.getDefaultStackProperties) {
            value = this._driver.getDefaultStackProperties()
        }
        return value
    },
    properties: () => this.properties,

    // Static Files API
    listFiles: async (instance, filePath) => {
        if (this._driver.listFiles) {
            return this._driver.listFiles(instance, filePath)
        } else {
            throw new Error('Driver does not implement file API ')
        }
    },
    updateFile: async (instance, filePath, update) => {
        if (this._driver.updateFile) {
            return this._driver.updateFile(instance, filePath, update)
        } else {
            throw new Error('Driver does not implement file API ')
        }
    },
    deleteFile: async (instance, filePath) => {
        if (this._driver.deleteFile) {
            return this._driver.deleteFile(instance, filePath)
        } else {
            throw new Error('Driver does not implement file API ')
        }
    },
    createDirectory: async (instance, filePath, directoryName) => {
        if (this._driver.createDirectory) {
            return this._driver.createDirectory(instance, filePath, directoryName)
        } else {
            throw new Error('Driver does not implement file API ')
        }
    },
    uploadFile: async (instance, filePath, fileBuffer) => {
        if (this._driver.uploadFile) {
            return this._driver.uploadFile(instance, filePath, fileBuffer)
        } else {
            throw new Error('Driver does not implement file API ')
        }
    },

    // Broker Agent API
    startBrokerAgent: async (broker) => {
        if (this._driver.startBrokerAgent) {
            return this._driver.startBrokerAgent(broker)
        } else {
            throw new Error('Driver does not implement Broker API ')
        }
    },
    stopBrokerAgent: async (broker) => {
        if (this._driver.stopBrokerAgent) {
            return this._driver.stopBrokerAgent(broker)
        } else {
            throw new Error('Driver does not implement Broker API ')
        }
    },
    getBrokerAgentState: async (broker) => {
        if (this._driver.stopBrokerAgent) {
            return this._driver.getBrokerAgentState(broker)
        } else {
            throw new Error('Driver does not implement Broker API ')
        }
    },
    sendBrokerAgentCommand: async (broker, command) => {
        if (this._driver.sendBrokerAgentCommand) {
            return this._driver.sendBrokerAgentCommand(broker, command)
        } else {
            throw new Error('Driver does not implement Broker API ')
        }
    },
    resources: async (project) => {
        if (this._driver.resources) {
            return this._driver.resources(project)
        } else {
            throw new Error('Driver does not implement resources API ')
        }
    },
    resourcesStream: async (project, socket) => {
        if (this._driver.resourcesStream) {
            return this._driver.resourcesStream(project, socket)
        } else {
            throw new Error('Driver does not implement resourcesStream API ')
        }
    }
}
