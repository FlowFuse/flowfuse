/**
 * The data controllers.
 *
 * These provide the main interface the application should use to interact with
 * the models.
 *
 *
 * @namespace models
 * @memberof forge.db
 */

const modelTypes = [
    'User',
    'Session',
    'AuthClient',
    'AccessToken',
    'Team',
    'TeamType',
    'Invitation',
    'AuditLog',
    'Project',
    'ProjectTemplate',
    'ProjectSnapshot',
    'Device',
    'BrokerClient'
]

async function init (app) {
    modelTypes.forEach(type => {
        const m = require(`./${type}`)
        module.exports[type] = {}
        for (const key in m) {
            module.exports[type][key] = m[key].bind(m, app)
        }
    })
}

// IMPORTANT: Any variables added to RESERVED_ENV_VARS should also be
// added to  frontend/src/pages/admin/Template/sections/Environment.vue
const RESERVED_ENV_VARS = ['FF_PROJECT_ID', 'FF_PROJECT_NAME', 'FF_DEVICE_ID', 'FF_DEVICE_NAME', 'FF_DEVICE_TYPE']
Object.freeze(RESERVED_ENV_VARS)

module.exports.init = init
module.exports.RESERVED_ENV_VARS = RESERVED_ENV_VARS
