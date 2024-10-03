/**
 * 1:1 copy of forge/lib/roles.js, should be kept in sync
 *
 * We should use this version in the frontend repository to maintain domain cohesion and maintain separation of concerns
 */

const Roles = {
    None: 0,
    Dashboard: 5,
    Viewer: 10,
    Member: 30,
    Owner: 50,
    Admin: 99
}
const RoleNames = {
    [Roles.None]: 'none',
    [Roles.Dashboard]: 'dashboard',
    [Roles.Viewer]: 'viewer',
    [Roles.Member]: 'member',
    [Roles.Owner]: 'owner',
    [Roles.Admin]: 'admin'
}

// For convenience, we want to be able to look up role values with both 'Role' and 'role'
Object.keys(RoleNames).forEach(role => {
    Roles[RoleNames[role]] = parseInt(role)
})

const TeamRoles = [
    Roles.Dashboard,
    Roles.Viewer,
    Roles.Member,
    Roles.Owner
]

module.exports = {
    Roles,
    RoleNames,
    TeamRoles
}
