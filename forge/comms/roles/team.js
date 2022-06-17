module.exports = (teamId) => {
    return {
        rolename: `team-${teamId}`,
        acls: [
            { acltype: 'subscribePattern', topic: `ff/v1/${teamId}/p/+/out/+/#`, priority: -1, allow: true },
            { acltype: 'publishClientSend', topic: `ff/v1/${teamId}/p/+/in/+/#`, priority: -1, allow: true }
        ]
    }
}
