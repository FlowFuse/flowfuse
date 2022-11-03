const fp = require('fastify-plugin')
const { Permissions } = require('../../lib/permissions')

// For device/project tokens, list the scopes they implicitly have.
// This will allow us to add scopes to existing tokens without having to update
// them (as that requires reprovisioning of devices and restaging of projects)
const IMPLICIT_TOKEN_SCOPES = {
    device: [],
    project: [
        'user:read',
        'project:flows:view',
        'project:flows:edit',
        'team:projects:list'
    ]
}

module.exports = fp(async function (app, opts, done) {
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
                // using an access-token
                return
            }
            // A user has permission based on:
            // - the resource they are accessing
            // - the action they want to perform

            // For all Team based permissions, the request should already have
            // request.team and request.teamMembership set
            const permission = Permissions[scope]
            if (permission.admin) {
                // Requires admin user - which would have already been approved
                // if they were an admin
                reply.code(403).send({ code: 'unauthorized', error: 'unauthorized' })
                throw new Error()
            } else if (app.settings.get(scope) === false) {
                // Permission disabled via admin settings
                reply.code(403).send({ code: 'unauthorized', error: 'unauthorized' })
                throw new Error()
            } else if (permission.role && (!request.session.scope || request.session.ownerType === 'user')) {
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
                // A request outside the context of a team. Currently this covers
                // /api/v1/user/* routes
                if (!request.session.User) {
                    reply.code(403).send({ code: 'unauthorized', error: 'unauthorized' })
                    throw new Error()
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
    done()
})
