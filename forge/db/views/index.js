/**
 * The data views.
 *
 * These provide utility functions for rendering views of objects in the database.
 *
 * For example, the User.userProfile view takes a User model instance and returns
 * the object that is suitable for returning on the external API.
 *
 * @namespace models
 * @memberof forge.db
 */

const modelTypes = [
    'AccessToken',
    'Application',
    'AuditLog',
    'Device',
    'Invitation',
    'Project',
    'ProjectSnapshot',
    'ProjectStack',
    'ProjectTemplate',
    'ProjectType',
    'Team',
    'TeamType',
    'User'
]

async function init (app) {
    modelTypes.forEach(type => {
        const m = require(`./${type}`)
        module.exports[type] = {}
        if (typeof m === 'function') {
            // New style:
            //  - views export a function that is called to get the view functions back
            //  - allows the views to contain their own schema definitions as well
            module.exports[type] = m(app)
        } else {
            // Old style - this will be phased out
            //  - views export their view functions directly
            //  - re-export them with an implicit 'app' first argument
            for (const key in m) {
                module.exports[type][key] = m[key].bind(m, app)
            }
        }
    })
}
module.exports.init = init
