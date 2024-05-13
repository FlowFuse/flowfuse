module.exports.init = function (app) {
    // TODO this should read kubernetes before check in
    if (app.config.driver.type === 'localfs' || app.config.driver.type === 'stub') {
        if (app.config.driver.options?.customHostnames) {
            app.config.features.register('customHostnames', true, true)

            app.db.models.Project.prototype.getCustomHostname = async function () {
            }

            app.db.models.Project.prototype.setCustomHostname = async function (hostname) {
            }

            app.db.models.Project.prototype.clearCustomHostname = async function () {
            }
        }
    }
}
