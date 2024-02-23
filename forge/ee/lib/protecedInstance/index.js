const { KEY_KEY_PROTECTED } = require('../../../db/models/ProjectSettings')

module.exports.init = function (app) {
    // Register protected instance feature flag
    app.config.features.register('protectedInstance', true)

    /**
     * 
     */
    async function isProtectedInstanceAllowed (team, projectType, ) {

    }

    app.db.models.Project.prototype.getProtectedInstanceState = async function () {
        return this.getSetting(KEY_KEY_PROTECTED)
    }

    app.db.models.Project.prototype.setProtectedInstanceState = async function (enabled) {
        return this.updateSetting(KEY_KEY_PROTECTED, enabled)
    }

    app.decorate('protectedInstance', {
        isProtectedInstanceAllowed
    })
}