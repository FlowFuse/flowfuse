module.exports = {
    init: async (app, driver, options) => {
        this._driver = driver
        this._app = app
        this.options = options

        let value = {}
        if (driver.init) {
            value = await this._driver.init(app, options)
        }

        return value
    },
    create: async (project, options) => {
        let value = {}
        if (this._app.license.active() && this._app.billing) {
            const subscription = this._app.db.models.Subscription.byTeam(project.Team.id)
            if (subscription) {
                this._app.billing.addProject(project.Team, project)
            } else {
                throw new Error('No Subscription for this team')
            }
        }
        if (this._driver.create) {
            value = await this._driver.create(project, options)
        }
        return value
    },
    remove: async (project) => {
        let value = {}
        if (this._app.license.active() && this._app.billing) {
            const subscription = this._app.db.models.Subscription.byTeam(project.Team.id)
            if (subscription) {
                this._app.billing.removeProject(project.Team, project)
            } else {
                throw new Error('No Subscription for this team')
            }
        }
        if (this._driver.remove) {
            value = await this._driver.remove(project)
        }
        return value
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
    start: async (project) => {
        let value = {}
        if (this._driver.start) {
            value = await this._driver.start(project)
        }
        return value
    },
    stop: async (project) => {
        let value = {}
        if (this._driver.stop) {
            value = await this._driver.stop(project)
        }
        return value
    },
    restart: async (project) => {
        let value = {}
        if (this._driver.restart) {
            value = this._driver.restart(project)
        } else {
            await this._driver.stop(project)
            value = await this._driver.start(project)
        }
        return value
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
    }
}
