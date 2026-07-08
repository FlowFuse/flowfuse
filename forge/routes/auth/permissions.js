const { requestContext } = require('@fastify/request-context')
const fp = require('fastify-plugin')

const { Permissions } = require('../../lib/permissions')
const { Roles } = require('../../lib/roles.js')

/**
 * Check whether a PAT's teamScopes allow access to the given team.
 * @param {object|null} pat - The PAT metadata object (from session or requestContext)
 * @param {string} teamHashId - The hashid of the team being accessed
 * @returns {boolean} true if access is allowed, false if denied
 */
function patAllowsTeam (pat, teamHashId) {
    if (!pat.teamScopes) {
        return true
    }
    return pat.teamScopes.some(scope => Object.prototype.hasOwnProperty.call(scope, teamHashId))
}

/**
 * Check whether a PAT's readOnly flag allows the given permission.
 * @param {object|null} pat - The PAT metadata object
 * @param {string} scope - The permission scope string
 * @returns {boolean} true if access is allowed, false if denied
 */
function patAllowsWrite (pat, scope) {
    if (!pat.readOnly) {
        return true
    }
    const permission = Permissions[scope]
    return !permission || permission.access === 'read'
}
// For device/project tokens, list the scopes they implicitly have.
// This will allow us to add scopes to existing tokens without having to update
// them (as that requires reprovisioning of devices and restaging of projects)
const IMPLICIT_TOKEN_SCOPES = {
    device: [
        'team:projects:list', // permit a device being edited via a tunnel in developer mode to list projects
        'library:entry:create', // permit a device being edited via a tunnel in developer mode to create library entries
        'library:entry:list', // permit a device being edited via a tunnel in developer mode to list library entries
        'broker:clients:list', // permit ff-mqtt nodes to list broker clients
        'broker:clients:link', // permit ff-mqtt nodes to link broker clients
        'assistant:call' // permit access to assistant
    ],
    project: [
        'user:read',
        'project:flows:view',
        'project:flows:edit',
        'team:projects:list',
        'library:entry:create',
        'library:entry:list',
        'broker:clients:list',
        'broker:clients:link',
        'assistant:call' // permit access to assistant
    ],
    'user:expert-mcp': [
        // applications
        'team:projects:list', // list applications, list hosted instances, get instances status
        'project:read', // get application details
        'team:device:list', // list application remote instances
        'application:audit-log', // get application audit log
        // devices
        'device:read', // get remote instance details
        'device:create', // create remote instance
        'device:edit', // assign remote instance to application
        // hosted instances
        'project:create', // create application, create hosted instance, check instance name
        'project-type:read',
        'project-type:list',
        'project:log', // get hosted instance logs
        // snapshots
        'project:snapshot:list', // list hosted instance snapshots
        'project:snapshot:create', // create hosted instance snapshot
        'device:snapshot:list', // list remote instance snapshots
        'device:snapshot:create', // create remote instance snapshot
        // teams
        'user:team:list', // list teams
        'team:read', // get team details
        // platform
        'stack:list',
        'flow-blueprint:list',
        'project:status',
        'template:list'
    ]
}

module.exports = fp(async function (app, opts) {
    function hasPermission (teamMembership, scope, context) {
        if (!teamMembership) {
            return false
        }

        // PAT scope enforcement via requestContext (set during auth).
        const isPAT = requestContext.get('isPAT')
        if (isPAT) {
            const pat = requestContext.get('pat')
            if (!patAllowsWrite(pat, scope)) {
                return false
            }
            const teamHashId = app.db.models.Team.encodeHashid(teamMembership.TeamId)
            if (!patAllowsTeam(pat, teamHashId)) {
                return false
            }
        }

        let userRole = teamMembership.role
        // Granular RBAC; if the request provides an application context for the request, check against
        // the teamMembership.permissions object
        if (app.config.features.enabled('rbacApplication')) {
            const application = context?.application?.hashid || context?.applicationId
            if (application && teamMembership.permissions?.applications?.[application] !== undefined) {
                userRole = teamMembership.permissions.applications[application]
            }
        }
        const permission = Permissions[scope]
        return userRole >= permission.role
    }
    function needsPermission (scope) {
        if (!Permissions[scope]) {
            throw new Error(`Unrecognised scope requested: '${scope}'`)
        }
        return async (request, reply) => {
            if (!request.session.scope && request.session.User && request.session.User.admin) {
                // Admins get to have all the fun - as long as they are logged in and not
                // using an access-token which has a reduced scope.
                // For PATs without adminOptIn, the admin flag is already stripped
                // at the auth layer, but we double-check here as defense in depth.
                if (!request.session.pat || request.session.pat.adminOptIn) {
                    // Even with admin bypass, PAT readOnly and teamScope still apply
                    if (request.session.pat) {
                        if (!patAllowsWrite(request.session.pat, scope)) {
                            reply.code(403).send({ code: 'unauthorized', error: 'unauthorized' })
                            throw new Error()
                        }
                        if (request.team && !patAllowsTeam(request.session.pat, request.team.hashid)) {
                            reply.code(403).send({ code: 'unauthorized', error: 'unauthorized' })
                            throw new Error()
                        }
                    }
                    return
                }
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
            } else if (permission.role && permission.role !== Roles.Admin && (!request.session.scope || request.session.ownerType === 'user' || request.session.ownerType === 'user:expert-mcp')) {
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
                let userRole = request.teamMembership.role
                if (app.config.features.enabled('rbacApplication')) {
                    // Granular RBAC; if the request provides an application context for the request, check against
                    // the teamMembership.permissions object
                    const application = request.application?.hashid || request.applicationId
                    if (application && request.teamMembership.permissions?.applications?.[application] !== undefined) {
                        userRole = request.teamMembership.permissions.applications[application]
                    }
                }
                // console.log(request.url, scope, request.teamMembership.role, userRole)
                if (userRole < permission.role) {
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
            // PAT scope enforcement: check team scope and read-only restrictions.
            // This runs after the standard permission checks pass, as an
            // additional restriction layer for PAT-authenticated requests.
            if (request.session.pat) {
                if (request.team && !patAllowsTeam(request.session.pat, request.team.hashid)) {
                    reply.code(403).send({ code: 'unauthorized', error: 'unauthorized' })
                    throw new Error()
                }
                if (!patAllowsWrite(request.session.pat, scope)) {
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
}, { name: 'app.routes.auth.permissions' })
