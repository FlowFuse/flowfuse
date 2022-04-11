/**
 * inflightProjectState - when projects are transitioning between states, there
 * is no need to store that in the database. But we do need to know it so the
 * information can be returned on the API.
 */
const inflightProjectState = { }

module.exports = {
    /**
     * Get the in-flight state of a project
     * @param {*} app
     * @param {*} project
     * @returns the in-flight state
     */
    getInflightState: function (app, project) {
        return inflightProjectState[project.id]
    },

    /**
     * Set the in-flight state of a project
     * @param {*} app
     * @param {*} project
     * @param {*} state
     */
    setInflightState: function (app, project, state) {
        inflightProjectState[project.id] = state
    },
    /**
     * Set the in-flight state of a project
     * @param {*} app
     * @param {*} project
     */
    clearInflightState: function (app, project) {
        delete inflightProjectState[project.id]
    },
    /**
     * Get the settings object that should be passed to nr-launcher so it can
     * start Node-RED with the proper project configuration.
     *
     * This merges the Project Template settings with the Project's own settings.
     *
     * @param {*} app the forge app
     * @param {*} project the project to get the settings for
     * @returns the runtime settings object
     */
    getRuntimeSettings: async function (app, project) {
        // This assumes the project has been loaded via `byId` so that
        // it has the template and ProjectSettings attached
        let result = {}
        const env = {}
        if (project.ProjectTemplate) {
            result = project.ProjectTemplate.settings
            if (result.env) {
                result.env.forEach(envVar => {
                    env[envVar.name] = envVar.value
                })
            }
        }
        if (project.ProjectSettings[0]?.key === 'settings') {
            const projectSettings = project.ProjectSettings[0].value
            result = app.db.controllers.ProjectTemplate.mergeSettings(result, projectSettings)
            if (result.env) {
                result.env.forEach(envVar => {
                    env[envVar.name] = envVar.value
                })
            }
        }

        result.env = env
        return result
    }
}
