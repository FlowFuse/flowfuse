const { KEY_CUSTOM_HOSTNAME } = require('../../../db/models/ProjectSettings')

module.exports.init = function (app) {
    if (app.config.driver.type === 'kubernetes' || app.config.driver.type === 'stub') {
        if (app.config.driver.options?.customHostname?.enabled && app.config.driver.options?.customHostname?.cnameTarget) {
            app.config.features.register('customHostnames', true, true)
            app.db.models.Project.prototype.getCustomHostname = async function () {
                return this.getSetting(KEY_CUSTOM_HOSTNAME)
            }

            app.db.models.Project.prototype.setCustomHostname = async function (hostname) {
                if (hostname) {
                    // need to check if hostname already in use
                    if (await app.db.models.ProjectSettings.isCustomHostnameUsed(hostname)) {
                        throw new Error('Name unavailable (used)')
                    }
                    if (app.config.domain && hostname.endsWith(app.config.domain.toLowerCase())) {
                        throw new Error('Name unavailable (domain clash)')
                    }
                    return this.updateSetting(KEY_CUSTOM_HOSTNAME, hostname)
                } else {
                    return this.removeSetting(KEY_CUSTOM_HOSTNAME)
                }
            }

            app.db.models.Project.prototype.clearCustomHostname = async function () {
                return this.removeSetting(KEY_CUSTOM_HOSTNAME)
            }
        }
    }
}
