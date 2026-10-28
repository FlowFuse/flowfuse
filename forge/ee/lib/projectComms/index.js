module.exports.init = function (app) {
    if (app.comms) {
        // Set the feature flag
        app.config.features.register('projectComms', true, false)

        // Register the broker comms ACLs for inter-project communication

        // Project ACL
        // Any project subscription topic needs to support both the plain subscription
        // and its shared-subscription equivalent for HA mode

        // Receive broadcasts from other projects in the team
        // - ff/v1/<team>/p/+/out/+/#
        app.comms.aclManager.addACL(
            'project',
            'sub',
            { topic: /^ff\/v1\/([^/]+)\/p\/[^/]+\/out\/[^/]+($|\/.*$)/, verify: 'checkTeamId', shared: true }
        )
        // Receive messages sent to this project
        // - ff/v1/<team>/p/<project>/in/+/#
        app.comms.aclManager.addACL(
            'project',
            'sub',
            { topic: /^ff\/v1\/([^/]+)\/p\/([^/]+)\/in\/[^/]+($|\/.*$)$/, verify: 'checkTeamAndObjectIds', shared: true }
        )
        // Receive link-call response messages sent to this project
        // - ff/v1/<team>/p/<project>/res[-id]/+/#
        app.comms.aclManager.addACL(
            'project',
            'sub',
            { topic: /^ff\/v1\/([^/]+)\/p\/([^/]+)\/res(?:-[^/]+)?\/[^/]+($|\/.*$)$/, verify: 'checkTeamAndObjectIds' }
        )
        // Send message to other project
        // - ff/v1/<team>/p/+/in/+/#
        app.comms.aclManager.addACL(
            'project',
            'pub',
            { topic: /^ff\/v1\/([^/]+)\/p\/[^/]+\/in\/[^/]+($|\/.*$)/, verify: 'checkTeamId' }
        )
        // Send link-call response messages to other project
        // - ff/v1/<team>/p/+/res/+/#
        app.comms.aclManager.addACL(
            'project',
            'pub',
            { topic: /^ff\/v1\/([^/]+)\/p\/[^/]+\/res(?:-[^/]+)?\/[^/]+($|\/.*$)/, verify: 'checkTeamId' }
        )
        // Send broadcast messages
        // - ff/v1/<team>/p/<project>/out/+/#
        app.comms.aclManager.addACL(
            'project',
            'pub',
            { topic: /^ff\/v1\/([^/]+)\/p\/([^/]+)\/out\/[^/]+($|\/.*$)/, verify: 'checkTeamAndObjectIds' }
        )
        // Receive application scoped broadcasts from members of this project's application
        // - ff/v1/<team>/a/<application>/p/+/out/+/#
        app.comms.aclManager.addACL(
            'project',
            'sub',
            { topic: /^ff\/v1\/([^/]+)\/a\/([^/]+)\/p\/([^/]+)\/out\/[^/]+($|\/.*$)/, verify: 'checkClientInApplication', shared: true }
        )
        // Send application scoped broadcast messages
        // - ff/v1/<team>/a/<application>/p/<project>/out/+/#
        app.comms.aclManager.addACL(
            'project',
            'pub',
            { topic: /^ff\/v1\/([^/]+)\/a\/([^/]+)\/p\/([^/]+)\/out\/[^/]+($|\/.*$)/, verify: 'checkClientInApplication', checkSource: true }
        )

        // Device ACL

        // Receive broadcasts from other projects in the team
        // - ff/v1/<team>/p/+/out/+/#
        app.comms.aclManager.addACL(
            'device',
            'sub',
            { topic: /^ff\/v1\/([^/]+)\/p\/([^/]+)\/out\/[^/]+($|\/.*$)/, verify: 'checkDeviceIsAssigned' }
        )
        // Receive messages sent to this device (instance owned)
        // - ff/v1/<team>/p/<project>/in/+/#
        app.comms.aclManager.addACL(
            'device',
            'sub',
            { topic: /^ff\/v1\/([^/]+)\/p\/(?!dev:)([^/]+)\/in\/[^/]+($|\/.*$)$/, verify: 'checkDeviceCanAccessProject' }
        )
        // Receive messages sent to this device (app owned)
        // - ff/v1/<team>/p/dev:<deviceid>/in/+/#
        app.comms.aclManager.addACL(
            'device',
            'sub',
            { topic: /^ff\/v1\/([^/]+)\/p\/dev:([^/]+)\/in\/[^/]+($|\/.*$)$/, verify: 'checkDeviceIsAssigned', deviceOwnerType: 'application' }
        )
        // Receive link-call response messages sent to this device (instance owned)
        // - ff/v1/<team>/p/<project>/res/+/#
        app.comms.aclManager.addACL(
            'device',
            'sub',
            { topic: /^ff\/v1\/([^/]+)\/p\/(?!dev:)([^/]+)\/res\/[^/]+($|\/.*$)$/, verify: 'checkDeviceCanAccessProject', deviceOwnerType: 'instance' }
        )
        // Receive link-call response messages sent to this device (app owned)
        // - ff/v1/<team>/p/dev:<deviceid>/res/+/#
        app.comms.aclManager.addACL(
            'device',
            'sub',
            { topic: /^ff\/v1\/([^/]+)\/p\/dev:([^/]+)\/res\/[^/]+($|\/.*$)$/, verify: 'checkDeviceIsAssigned', deviceOwnerType: 'application' }
        )
        // Send message to specific project
        // - ff/v1/<team>/p/<project>/in/+/#
        app.comms.aclManager.addACL(
            'device',
            'pub',
            { topic: /^ff\/v1\/([^/]+)\/p\/(?!dev:)([^/]+)\/in\/[^/]+($|\/.*$)/, verify: 'checkDeviceCanAccessProject', deviceOwnerType: 'instance' }
        )
        // Send message to specific app owned device
        // - ff/v1/<team>/p/dev:<deviceid>/in/+/#
        app.comms.aclManager.addACL(
            'device',
            'pub',
            { topic: /^ff\/v1\/([^/]+)\/p\/dev:([^/]+)\/in\/[^/]+($|\/.*$)/, verify: 'checkDeviceIsAssigned' }
        )
        // Send broadcast messages (from instance owned devices in the team)
        // - ff/v1/<team>/p/<project>/out/+/#
        app.comms.aclManager.addACL(
            'device',
            'pub',
            { topic: /^ff\/v1\/([^/]+)\/p\/(?!dev:)([^/]+)\/out\/[^/]+($|\/.*$)/, verify: 'checkDeviceCanAccessProject', deviceOwnerType: 'instance' }
        )
        // Send broadcast messages (from app owned devices in the team)
        // - ff/v1/<team>/p/dev:<deviceid>/out/+/#
        app.comms.aclManager.addACL(
            'device',
            'pub',
            { topic: /^ff\/v1\/([^/]+)\/p\/dev:([^/]+)\/out\/[^/]+($|\/.*$)/, verify: 'checkDeviceIsAssigned', deviceOwnerType: 'application' }
        )
        // Send link-call response messages back to source instance
        // - ff/v1/<team>/p/+/res[-id]/+/#
        app.comms.aclManager.addACL(
            'device',
            'pub',
            { topic: /^ff\/v1\/([^/]+)\/p\/(?!dev:)([^/]+)\/res(?:-[^/]+)?\/[^/]+($|\/.*$)/, verify: 'checkDeviceCanAccessProject', deviceOwnerType: 'instance' }
        )
        // Send link-call response messages back to source app owned device
        // - ff/v1/<team>/p/dev:<deviceid>/res/+/#
        app.comms.aclManager.addACL(
            'device',
            'pub',
            { topic: /^ff\/v1\/([^/]+)\/p\/dev:([^/]+)\/res\/[^/]+($|\/.*$)/, verify: 'checkDeviceIsAssigned' }
        )
        // Receive application scoped broadcasts from members of this device's application
        // - ff/v1/<team>/a/<application>/p/+/out/+/#
        app.comms.aclManager.addACL(
            'device',
            'sub',
            { topic: /^ff\/v1\/([^/]+)\/a\/([^/]+)\/p\/([^/]+)\/out\/[^/]+($|\/.*$)/, verify: 'checkClientInApplication' }
        )
        // Send application scoped broadcast messages
        // - ff/v1/<team>/a/<application>/p/<project | dev:deviceid>/out/+/#
        app.comms.aclManager.addACL(
            'device',
            'pub',
            { topic: /^ff\/v1\/([^/]+)\/a\/([^/]+)\/p\/([^/]+)\/out\/[^/]+($|\/.*$)/, verify: 'checkClientInApplication', checkSource: true }
        )

        // Team Broker ACLS - pub/sub to common topic space
        app.comms.aclManager.addACL('project', 'pub', { topic: /^ff\/v1\/([^/]+)\/c\/[^/]+($|\/.*$)/, verify: 'checkTeamId' })
        app.comms.aclManager.addACL('project', 'sub', { topic: /^ff\/v1\/([^/]+)\/c\/[^/]+($|\/.*$)/, verify: 'checkTeamId' })
        app.comms.aclManager.addACL('device', 'pub', { topic: /^ff\/v1\/([^/]+)\/c\/[^/]+($|\/.*$)/, verify: 'checkTeamId' })
        app.comms.aclManager.addACL('device', 'sub', { topic: /^ff\/v1\/([^/]+)\/c\/[^/]+($|\/.*$)/, verify: 'checkTeamId' })
    }
}
