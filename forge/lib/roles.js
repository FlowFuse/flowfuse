const Roles = {
    None: 0,
    Viewer: 10,
    Member: 30,
    Owner: 50,
    Admin: 99
}
const RoleNames = {
    [Roles.None]: 'none',
    [Roles.Viewer]: 'viewer',
    [Roles.Member]: 'member',
    [Roles.Owner]: 'owner',
    [Roles.Admin]: 'admin'
}

const TeamRoles = [
    Roles.Viewer,
    Roles.Member,
    Roles.Owner
]

module.exports = {
    Roles,
    RoleNames,
    TeamRoles
}
