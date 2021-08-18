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

module.exports = fp(async function(app, _opts, next){

    const containerOpts = {
        dialect: process.env.CONTAINER_DRIVER || 'docker',
    }

    try {
        const driver = require("./"+containerOpts.dialect)
        let configurables = await driver.init(app, {
            domain: process.env.DOMAIN ||"example.com",
            containers:{
                basic: "docker-pi.local:5000/bronze-node-red:latest"
            }
        });
        app.decorate('containers', driver);
    } catch (err) {
        console.log(err)
    }

    next();
})