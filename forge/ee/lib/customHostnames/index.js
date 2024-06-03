const dns = require('dns/promises')

const { KEY_CUSTOM_HOSTNAME } = require('../../../db/models/ProjectSettings')

module.exports.init = function (app) {
    app.log.debug(`EE CustomHostname ${app.config.driver.type}\n ${JSON.stringify(app.config.driver.options)}`)
    // TODO localfs should be removed before check in
    if (app.config.driver.type === 'kubernetes' || app.config.driver.type === 'stub' || app.config.driver.type === 'localfs') {
        if (app.config.driver.options?.customHostname?.enabled) {
            app.log.info('Enabling Custom Hostname Feature')
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
                    this.updateSetting(KEY_CUSTOM_HOSTNAME, hostname)
                    let found
                    const cname = app.config.driver.options?.customHostname?.cnameTarget
                    if (cname) {
                        try {
                            const targets = await dns.resolveCname(hostname)
                            found = targets.includes(cname)
                        } catch (err) {
                            found = false
                        }
                    }
                    const response = { hostname }
                    if (cname) {
                        response.cname = cname
                        response.found = found
                    }
                    return response
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
