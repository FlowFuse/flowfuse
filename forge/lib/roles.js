const Roles = {
    None: 0,
    Member: 30,
    Owner: 50,
    Admin: 99
}
const RoleNames = {
    [Roles.None]: 'none',
    [Roles.Member]: 'member',
    [Roles.Owner]: 'owner',
    [Roles.Admin]: 'admin'
}

const TeamRoles = [
    Roles.Member,
    Roles.Owner
]

module.exports = {
    Roles,
    RoleNames,
    TeamRoles
}
