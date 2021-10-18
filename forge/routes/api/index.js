/**
 * Routes related to the forge api
 *
 * The forge api is served from `/api/v1/`.
 * @namespace api
 * @memberof forge.routes
 */
const User = require("./user.js");
const Users = require("./users.js");
const Team = require("./team.js");
const Project = require("./project.js");
const Projects = require("./projects.js");

module.exports = async function(app) {
    app.addHook('preHandler',app.verifySession);
    app.register(User, { prefix: "/user" })
    app.register(Users, { prefix: "/users" })
    app.register(Team, { prefix: "/teams" })
    app.register(Project, { prefix: "/project"})
    app.register(Projects, { prefix: "/projects"})
    app.get('*', function (request, reply) {
        reply.code(404).type('text/html').send('Not Found')
    })
}
