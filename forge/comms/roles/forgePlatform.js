module.exports = () => {
    return {
        rolename: 'forge_platform',
        acls: [
            {
                acltype: 'publishClientSend',
                topic: 'ff/v1/+/p/+/command',
                priority: -1,
                allow: true
            },
            {
                acltype: 'publishClientSend',
                topic: 'ff/v1/+/d/+/command',
                priority: -1,
                allow: true
            },
            {
                acltype: 'subscribePattern',
                topic: 'ff/v1/+/p/+/status',
                priority: -1,
                allow: true
            },
            {
                acltype: 'subscribePattern',
                topic: 'ff/v1/+/d/+/status',
                priority: -1,
                allow: true
            }
        ]
    }
}
