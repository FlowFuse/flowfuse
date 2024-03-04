const { KEY_PROTECTED } = require('../../../db/models/ProjectSettings')

module.exports.init = function (app) {
    // Register protected instance feature flag
    app.config.features.register('protectedInstance', true, true)

    /**
     * Check if Protected status allowed
     */
    async function isProtectedInstanceAllowed (team, projectType) {
        const teamType = await team.getTeamType()
        if (teamType.getFeatureProperty('protectedInstance', false)) {
            return true
        }
        return false
    }

    app.db.models.Project.prototype.getProtectedInstanceState = async function () {
        return this.getSetting(KEY_PROTECTED)
    }

    app.db.models.Project.prototype.updateProtectedInstanceState = async function (protectedConfig) {
        if (!protectedConfig) {
            app.db.controllers.StorageSession.removeAllUsersFromInstance(this)
            return this.removeSetting(KEY_PROTECTED)
        }
        if (Object.hasOwn(protectedConfig, 'enabled')) {
            app.db.controllers.StorageSession.removeAllUsersFromInstance(this)
            return this.updateSetting(KEY_PROTECTED, protectedConfig)
        }
    }

    app.decorate('protectedInstance', {
        isProtectedInstanceAllowed
    })
}
