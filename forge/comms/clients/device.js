module.exports = (teamId, deviceId, password) => {
    return {
        username: `device-${deviceId}`,
        password: password,
        roles: [
            { rolename: `team-${teamId}`, priority: -1 },
            { rolename: `device-${deviceId}-admin`, priority: -1 }
        ]
    }
}
