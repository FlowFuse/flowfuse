const { KEY_PROTECTED } = require('../../../db/models/ProjectSettings')

module.exports.init = function (app) {
    // Register protected instance feature flag
    app.config.features.register('protectedInstance', true, true)

    /**
     * Check if Protected status allowed
     */
    async function isProtectedInstanceAllowed (team, projectType) {
        await team.ensureTeamTypeExists()
        if (team.getFeatureProperty('protectedInstance', false)) {
            return true
        }
        return false
    }

    app.db.models.Project.prototype.getProtectedInstanceState = async function () {
        return this.getSetting(KEY_PROTECTED)
    }

    app.db.models.Project.prototype.updateProtectedInstanceState = async function (protectedConfig) {
        if (!protectedConfig) {
            clearEditorSessions(this)
            return this.removeSetting(KEY_PROTECTED)
        }
        if (Object.hasOwn(protectedConfig, 'enabled')) {
            clearEditorSessions(this)
            return this.updateSetting(KEY_PROTECTED, protectedConfig)
        }
    }

    // Revoking each editor token can be slow, so this runs in the background
    function clearEditorSessions (instance) {
        app.db.controllers.StorageSession.removeAllUsersFromInstance(instance).catch(err => {
            app.log.warn(`Failed to clear editor sessions for instance ${instance.id}: ${err.toString()}`)
        })
    }

    app.decorate('protectedInstance', {
        isProtectedInstanceAllowed
    })
}
