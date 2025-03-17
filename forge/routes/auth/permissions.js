const fp = require('fastify-plugin')

const { Permissions } = require('../../lib/permissions')
const { Roles } = require('../../lib/roles.js')
// For device/project tokens, list the scopes they implicitly have.
// This will allow us to add scopes to existing tokens without having to update
// them (as that requires reprovisioning of devices and restaging of projects)
const IMPLICIT_TOKEN_SCOPES = {
    device: [
        'team:projects:list', // permit a device being edited via a tunnel in developer mode to list projects
        'library:entry:create', // permit a device being edited via a tunnel in developer mode to create library entries
        'library:entry:list' // permit a device being edited via a tunnel in developer mode to list library entries
    ],
    project: [
        'user:read',
        'project:flows:view',
        'project:flows:edit',
        'team:projects:list',
        'library:entry:create',
        'library:entry:list'
    ]
}

module.exports = fp(async function (app, opts) {
    function hasPermission (teamMembership, scope) {
        if (!teamMembership) {
            return false
        }
        const permission = Permissions[scope]
        return teamMembership.role >= permission.role
    }
    function needsPermission (scope) {
        if (!Permissions[scope]) {
            throw new Error(`Unrecognised scope requested: '${scope}'`)
        }
        return async (request, reply) => {
            if (!request.session.scope && request.session.User && request.session.User.admin) {
                // Admins get to have all the fun - as long as they are logged in and not
                // using an access-token which has a reduced scope
                return
            }
            // A user has permission based on:
            // - the resource they are accessing
            // - the action they want to perform

            // For all Team based permissions, the request should already have
            // request.team and request.teamMembership set
            const permission = Permissions[scope]
            if (permission.role === Roles.Admin && !request.session.User.admin && !permission.self) {
                // Requires admin user
                reply.code(403).send({ code: 'unauthorized', error: 'unauthorized' })
                throw new Error()
            } else if (app.settings.get(scope) === false) {
                // Permission disabled via admin settings
                reply.code(403).send({ code: 'unauthorized', error: 'unauthorized' })
                throw new Error()
            } else if (permission.role && permission.role !== Roles.Admin && (!request.session.scope || request.session.ownerType === 'user')) {
                // The user is required to have a role in the team associated with
                // this request
                if (!request.teamMembership) {
                    reply.code(403).send({ code: 'unauthorized', error: 'unauthorized' })
                    throw new Error()
                }
                if (permission.self && (request.user && (request.user.id === request.session.User?.id))) {
                    // This permission is permitted if the user is operating on themselves
                    return
                }
                if (request.teamMembership.role < permission.role) {
                    reply.code(403).send({ code: 'unauthorized', error: 'unauthorized' })
                    throw new Error()
                }
            } else if (permission.self) {
                // A request outside the context of a team.
                if (!request.session.User) {
                    reply.code(403).send({ code: 'unauthorized', error: 'unauthorized' })
                    throw new Error()
                }
                if (request.user) {
                    // This request is in the context of a user. Ensure it is the
                    // session user
                    if (request.user.id !== request.session.User?.id) {
                        reply.code(403).send({ code: 'unauthorized', error: 'unauthorized' })
                        throw new Error()
                    }
                }
            }
            if (request.session.scope) {
                // All things being equal, the user does have this permission
                // But they are using an access_token that could be scoped down
                // We also need to check against the list of implicit scopes for
                // a given token type (ie device/project)
                if (!request.session.scope.includes(scope) &&
                    (!IMPLICIT_TOKEN_SCOPES[request.session.ownerType] || !IMPLICIT_TOKEN_SCOPES[request.session.ownerType].includes(scope))) {
                    reply.code(403).send({ code: 'unauthorized', error: 'unauthorized' })
                    throw new Error()
                }
            }
        }
    }

    app.decorate('hasPermission', hasPermission)
    app.decorate('needsPermission', needsPermission)
}, { name: 'app.routes.auth.permissions' })
