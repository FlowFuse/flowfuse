const fp = require("fastify-plugin");
const { Roles } = require("../../lib/roles.js")

const defaultPermissions = {
    // Team Scoped Actions
    "team:create":           { description: "Create Team",           admin: false },
    "team:edit":             { description: "Edit Team",             role: Roles.Owner },
    "team:delete":           { description: "Delete Team",           role: Roles.Owner },
    "team:audit-log":        { description: "Access Team Audit Log", role: Roles.Owner },
    // Team Members
    "team:user:add":         { description: "Add Members",           role: Roles.Admin },
    "team:user:invite":      { description: "Invite Members",        role: Roles.Owner },
    "team:user:remove":      { description: "Remove Member",         role: Roles.Owner, self: true },
    "team:user:change-role": { description: "Modify Member role",    role: Roles.Owner },
    // Projects
    "project:create":        { description: "Create Project",        role: Roles.Owner },
    "project:delete":        { description: "Delete Project",        role: Roles.Owner },
    "project:transfer":      { description: "Transfer Project",      role: Roles.Owner },
    "project:change-status": { description: "Start/Stop Project",    role: Roles.Owner },
    "project:edit":          { description: "Edit Project Settings", role: Roles.Owner },
    "project:log":           { description: "Access Project Log",    role: Roles.Member },
    "project:audit-log":     { description: "Access Project Audit Log", role: Roles.Member },
    // Project Editor
    "project:flows:view":    { description: "View Project Flows",    role: Roles.Member },
    "project:flows:edit":    { description: "Edit Project Flows",    role: Roles.Member },
}


module.exports = fp(async function(app, opts, done) {
    function needsPermission(scope) {
        if (!defaultPermissions[scope]) {
            throw new Error(`Unrecognised scope requested: '${scope}'`)
        }
        return async (request, reply) => {
            if (request.session.User && request.session.User.admin) {
                // Admins get to have all the fun
                return
            }

            // A user has permission based on:
            // - the resource they are accessing
            // - the action they want to perform

            // For all Team based permissions, the request should already have
            // request.team and request.teamMembership set
            const permission = defaultPermissions[scope]
            if (permission.admin) {
                // Requires admin user - which would have already been approved
                // if they were an admin
                reply.code(403).send({ error: 'unauthorized' });
                throw new Error();
            } else if (app.settings.get(scope) === false) {
                // Permission disabled via admin settings
                reply.code(403).send({ error: 'unauthorized' });
                throw new Error();
            } else if (permission.role) {
                // The user is required to have a role in the team associated with
                // this request
                if (!request.teamMembership) {
                    reply.code(403).send({ error: 'unauthorized' });
                    throw new Error();
                }
                if (permission.self && request.user.id === request.session.User.id) {
                    // This permission is permitted if the user is operating on themselves
                    return;
                }
                if (request.teamMembership.role < permission.role) {
                    reply.code(403).send({ error: 'unauthorized' });
                    throw new Error();
                }
            }
        }
    }


    app.decorate("needsPermission", needsPermission);
    done();
});
