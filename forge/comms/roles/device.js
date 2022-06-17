module.exports = (teamId, deviceId) => {
    return {
        rolename: `device-${deviceId}-admin`,
        acls: [
            { acltype: 'subscribePattern', topic: `ff/v1/${teamId}/d/${deviceId}/command`, priority: -1, allow: true },
            { acltype: 'publishClientSend', topic: `ff/v1/${teamId}/d/${deviceId}/status`, priority: -1, allow: true }
        ]
    }
}
