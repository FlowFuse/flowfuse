const { KEY_BILLING_STATE } = require('../../../db/models/ProjectSettings')

class SubscriptionHandler {
    constructor (app) {
        this._app = app
    }

    async requireSubscription (team) {
        const subscription = await this._app.db.models.Subscription.byTeamId(team.id)
        if (!subscription) {
            throw new Error('No Subscription for this team')
        }

        return subscription
    }

    async requireActiveSubscription (team) {
        const subscription = await this.requireSubscription(team)

        if (subscription.isCanceled()) {
            throw new Error('Teams subscription is currently canceled')
        }

        return subscription
    }

    async addProject (project) {
        await this.requireActiveSubscription(project.Team)

        try {
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
    async removeProject (project, { skipBilling = false }) {
        const subscription = await this.requireSubscription(project.Team)
        if (subscription.isCanceled()) {
            this._app.log.warn(`Skipped removing project '${project.id}' from subscription for canceled subscription '${subscription.subscription}'`)
            return
        }

        if (skipBilling) {
            const BILLING_STATES = this._app.db.models.ProjectSettings.BILLING_STATES
            if (await project.getSetting(KEY_BILLING_STATE) === BILLING_STATES.UNKNOWN) {
                this._app.log.info('Billing state of project is unknown, but remove attempt that skips billing made, assuming it is currently billed')
                await project.updateSetting(KEY_BILLING_STATE, BILLING_STATES.BILLED)
            }

            this._app.log.info(`Skipped removing project '${project.id}' from subscription - skip billing flag set'`)
            return
        }

        try {
            await this._app.billing.removeProject(project.Team, project)
        } catch (err) {
            this._app.log.error(`Problem removing project from subscription: ${err}`)
            throw new Error('Problem with removing project from subscription')
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
            return app.license.active() && app.billing
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
        if (project.state !== 'suspended') {
            // Only updated billing if the project isn't already suspended
            if (this._isBillingEnabled()) {
                await this._subscriptionHandler.removeProject(project)
            }
        }
        if (this._driver.remove) {
            await this._driver.remove(project)
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
        if (this._isBillingEnabled()) {
            await this._subscriptionHandler.requireActiveSubscription(project.Team)
        }
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
        if (this._isBillingEnabled()) {
            await this._subscriptionHandler.requireActiveSubscription(project.Team)
        }
        if (this._driver.restartFlows) {
            this._driver.restartFlows(project, options)
        }
    },
    revokeUserToken: async (project, token) => { // logout:nodered(step-2)
        if (this._driver.revokeUserToken) {
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
    properties: () => this.properties
}
