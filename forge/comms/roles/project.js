module.exports = (teamId, projectId) => {
    return {
        rolename: `project-${projectId}`,
        acls: [
            { acltype: 'subscribePattern', topic: `ff/v1/${teamId}/p/${projectId}/in/+/#`, priority: -1, allow: true },
            { acltype: 'publishClientSend', topic: `ff/v1/${teamId}/p/${projectId}/out/+/#`, priority: -1, allow: true }
        ]
    }
}
