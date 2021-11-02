'use strict'

const fastify = require('fastify')
const db = require("./db")
const routes = require('./routes')
const config = require("./config");
const license = require("./licensing");
const containers = require('./containers');

/**
  * The main entry point to the FlowForge application.
  *
  * This creates the Fastify server, registers our plugins and starts it listen
  * on `process.env.PORT`.
  *
  * @namespace forge
  */

const server = fastify()

server.addHook('onError', async (request, reply, error) => {
    // Useful for debugging when a route goes wrong
    console.log(error.stack);
})

// Config : loads environment configuration
server.register(config);
// License
server.register(license);
// DB : the database connection/models/views/controllers
server.register(db);

process.env.PORT = process.env.PORT || 3000;
if (!process.env.BASE_URL) {
    process.env.BASE_URL = `http://localhost:${process.env.PORT}`;
}

// Routes : the HTTP routes
server.register(routes)
// Containers:
server.register(containers);

// Wait until everything is loaded so PORT can be set via .env config
server.ready().then(() => {
    // Start the server
    server.listen(process.env.PORT,'0.0.0.0', function (err, address) {
        if (err) {
            console.error(err)
            process.exit(1)
        }
        console.log(`Server listening on ${address}`)
    })

})
