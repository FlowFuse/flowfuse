/**
 * Routes related to the forge api
 *
 * The forge api is served from `/api/v1/`.
 * @namespace api
 * @memberof forge.routes
 */
const Admin = require('./admin.js')
const Application = require('./application.js')
const Assistant = require('./assistant.js')
const Device = require('./device.js')
const Project = require('./project.js')
const ProjectType = require('./projectType.js')
const Search = require('./search.js')
const Settings = require('./settings.js')
const Snapshot = require('./snapshot.js')
const Stack = require('./stack.js')
const Team = require('./team.js')
const TeamType = require('./teamType.js')
const Template = require('./template.js')
const User = require('./user.js')
const Users = require('./users.js')

module.exports = async function (app) {
    app.addHook('preHandler', app.verifySession)
    app.register(Settings, { prefix: '/settings' })
    app.register(Admin, { prefix: '/admin' })
    app.register(User, { prefix: '/user' })
    app.register(Users, { prefix: '/users' })
    app.register(Team, { prefix: '/teams' })
    app.register(TeamType, { prefix: '/team-types' })
    app.register(Application, { prefix: '/applications' })
    app.register(Project, { prefix: '/projects' })
    app.register(Stack, { prefix: '/stacks' })
    app.register(Template, { prefix: '/templates' })
    app.register(Device, { prefix: '/devices' })
    app.register(ProjectType, { prefix: '/project-types' })
    app.register(Snapshot, { prefix: '/snapshots' })
    app.register(Assistant, { prefix: '/assistant' })
    app.register(Search, { prefix: '/search' })
    app.get('*', function (request, reply) {
        reply.code(404).send({ code: 'not_found', error: 'Not Found' })
    })
}
