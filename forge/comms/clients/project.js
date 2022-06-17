module.exports = (teamId, projectId, password) => {
    return {
        username: `project-${projectId}`,
        password: password,
        roles: [
            { rolename: `team-${teamId}`, priority: -1 },
            { rolename: `launcher-${projectId}-admin`, priority: -1 },
            { rolename: `project-${projectId}`, priority: -1 }
        ]
    }
}
