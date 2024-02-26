const { KEY_PROTECTED } = require('../../../db/models/ProjectSettings')

module.exports.init = function (app) {
    // Register protected instance feature flag
    app.config.features.register('protectedInstance', true)

    /**
     * Check if Protected status allowed
     */
    async function isProtectedInstanceAllowed (team, projectType) {
        const teamType = await team.getTeamType()
        if (!teamType.getFeatureProperty('protectedInstance', true)) {
            return false
        }
    }

    app.db.models.Project.prototype.getProtectedInstanceState = async function () {
        return this.getSetting(KEY_PROTECTED)
    }

    app.db.models.Project.prototype.updateProtectedInstanceState = async function (protectedConfig) {
        if (!protectedConfig) {
            return this.removeSetting(KEY_PROTECTED)
        }
        if (Object.hasOwn(protectedConfig, 'enabled')) {
            return this.updateSetting(KEY_PROTECTED, protectedConfig)
        }
    }

    app.decorate('protectedInstance', {
        isProtectedInstanceAllowed
    })
}
