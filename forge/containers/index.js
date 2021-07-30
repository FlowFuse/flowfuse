/**
 * The connection to the container backend
 * 
 * This handles creating, deleting, querying containers
 * 
 * @namespace containers
 * @memberof forge
 */

const fp = require('fastify-plugin')

module.exports = fp(async function(app, _opts, next){

    const containerOpts = {
        dialect: process.env.CONTAINER_DRIVER || 'docker',
    }

    try {
        const driver = require("./"+containerOpts.dialect)
        await driver.init(app, {
            domain: process.env.DOMAIN ||"example.com"
        });
        app.decorate('containers', driver);
    } catch (err) {
        console.log(err)
    }

    next();
})