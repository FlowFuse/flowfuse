'use strict'

const fastify = require('fastify')
const db = require("./db")
const routes = require('./routes')
const config = require("./config");
const license = require("../ee/forge/licensing");
const containers = require('./containers');

/**
  * The main entry point to the FlowForge application.
  *
  * This creates the Fastify server, registers our plugins and starts it listen
  * on `process.env.PORT`.
  *
  * @namespace forge
  */

(async function() {

    const server = fastify()

    server.addHook('onError', async (request, reply, error) => {
        // Useful for debugging when a route goes wrong
        console.log(error.stack);
    })

    // Config : loads environment configuration
    await server.register(config);
    // License
    await server.register(license);
    // DB : the database connection/models/views/controllers
    await server.register(db);
    await server.db.init();

    process.env.PORT = process.env.PORT || 3000;
    process.env.BASE_URL = `http://localhost:${process.env.PORT}`;

    // Routes : the HTTP routes
    await server.register(routes)
    // Containers:
    await server.register(containers);

    // Wait until everything is loaded so PORT can be set via .env config
    await server.ready()

        // Start the server
    const address = await server.listen(process.env.PORT);

    console.log(`Server listening on ${address}`);
})().catch(err => {
    console.log(err);
    process.exitCode = 1;
})
