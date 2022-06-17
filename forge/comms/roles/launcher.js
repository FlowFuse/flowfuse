module.exports = (teamId, projectId) => {
    return {
        rolename: `launcher-${projectId}-admin`,
        acls: [
            { acltype: 'subscribePattern', topic: `ff/v1/${teamId}/p/${projectId}/command`, priority: -1, allow: true },
            { acltype: 'publishClientSend', topic: `ff/v1/${teamId}/p/${projectId}/status`, priority: -1, allow: true }
        ]
    }
}
