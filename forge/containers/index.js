/**
 * The connection to the container backend
 *
 * This handles creating, deleting, querying containers
 *
 * @namespace containers
 * @memberof forge
 */

/**
 * @typedef {Object} forge.containers.Project
 * @property {string} id - UUID that represents the project
 * @property {string} name - Name of the project
 * @property {number} team - ID of the owning team
 */

/**
 * @typedef {Object} forge.containers.Options
 * @property {string} domain - The root domain to expose the instance as
 */

/**
 * This needs work
 *
 * @typedef {Object} forge.containers.ProjectArguemnts
 *
 */

/**
 * @typedef {Object} forge.Status
 * @property {string} status
 */

const fp = require('fastify-plugin')

module.exports = fp(async function (app, _opts, next) {
    const containerDialect = app.config.driver.type

    try {
        const driver = require('@flowforge/' + containerDialect)
        await driver.init(app, {
            domain: app.config.domain || 'example.com',
            // this list needs loading from an external source
            containers: {
                basic: 'flowforge/node-red'
            }
        })
        app.decorate('containers', driver)
    } catch (err) {
        console.log('Problem loading the Container Driver, should really exit here as nothing will work')
        console.log(err)
    }

    next()
})
