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
