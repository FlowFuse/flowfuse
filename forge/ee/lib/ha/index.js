const { KEY_HA } = require('../../../db/models/ProjectSettings')

module.exports.init = function (app) {
    if (app.config.driver.type === 'k8s' || app.config.driver.type === 'stub') {
        // Register ha flag as a private flag - no requirement to expose it in public settings
        app.config.features.register('ha', true)

        /**
         * Check if HA is allowed for this given team/projectType/haConfig combination
         * @param {*} team
         * @param {*} projectType
         * @param {*} haConfig
         * @returns true/false
         */
        async function isHAAllowed (team, projectType, haConfig) {
            // For initial beta release, we will support 1-2 replicas.
            // 1 replica is equivalent to no HA
            // In the future this will need to take into account the team type
            return (haConfig.replicas > 0 && haConfig.replicas < 3)
        }

        // Add ha functions to the Project model
        app.db.models.Project.prototype.getHASettings = async function () {
            return this.getSetting(KEY_HA)
        }
        app.db.models.Project.prototype.updateHASettings = async function (haConfig) {
            if (!haConfig) {
                return this.removeSetting(KEY_HA)
            }
            if (haConfig?.replicas > 0 && haConfig?.replicas < 3) {
                return this.updateSetting(KEY_HA, {
                    replicas: haConfig.replicas
                })
            }
        }

        app.decorate('ha', {
            isHAAllowed
        })
    }
}
