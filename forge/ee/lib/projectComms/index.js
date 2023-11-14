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
        // - ff/v1/<team>/p/<project>/res/+/#
        // - ff/v1/<team>/p/<project>/res-<id>/+/#
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

        // Device ACL

        // Receive broadcasts from other projects in the team
        // - ff/v1/<team>/p/+/out/+/#
        app.comms.aclManager.addACL(
            'device',
            'sub',
            { topic: /^ff\/v1\/([^/]+)\/p\/([^/]+)\/out\/[^/]+($|\/.*$)/, verify: 'checkDeviceIsAssigned' }
        )
        // Receive messages sent to this device
        // - ff/v1/<team>/p/<project>/in/+/#
        app.comms.aclManager.addACL(
            'device',
            'sub',
            { topic: /^ff\/v1\/([^/]+)\/p\/([^/]+)\/in\/[^/]+($|\/.*$)$/, verify: 'checkDeviceCanAccessProject' }
        )
        // Receive link-call response messages sent to this device (instance owned)
        // - ff/v1/<team>/p/<project>/res/+/#
        app.comms.aclManager.addACL(
            'device',
            'sub',
            { topic: /^ff\/v1\/([^/]+)\/p\/([^/]{11,})\/res\/[^/]+($|\/.*$)$/, verify: 'checkDeviceCanAccessProject' }
        )
        // Receive link-call response messages sent to this device (app owned)
        // - ff/v1/<team>/p/<appid>/res/+/#
        app.comms.aclManager.addACL(
            'device',
            'sub',
            { topic: /^ff\/v1\/([^/]+)\/p\/([^/]{10})\/res\/[^/]+($|\/.*$)$/, verify: 'checkDeviceAssignedToApplication' }
        )

        // Send message to specific project
        // A device ID is exactly 10 chars long, so any topic with an ID longer than that
        // is a project instance topic
        // At this time, we don't support sending messages direct to an app owned device
        // - ff/v1/<team>/p/<project>/in/+/#
        app.comms.aclManager.addACL(
            'device',
            'pub',
            { topic: /^ff\/v1\/([^/]+)\/p\/([^/]{11,})\/in\/[^/]+($|\/.*$)/, verify: 'checkDeviceCanAccessProject' }
        )
        // Send broadcast messages (from instance owned devices in the team)
        // - ff/v1/<team>/p/<project>/out/+/#
        app.comms.aclManager.addACL(
            'device',
            'pub',
            { topic: /^ff\/v1\/([^/]+)\/p\/([^/]{11,})\/out\/[^/]+($|\/.*$)/, verify: 'checkDeviceCanAccessProject' }
        )
        // Send broadcast messages (from app owned devices in the team)
        // - ff/v1/<team>/p/<device>/out/+/#
        app.comms.aclManager.addACL(
            'device',
            'pub',
            { topic: /^ff\/v1\/([^/]+)\/p\/([^/]{10})\/out\/[^/]+($|\/.*$)/, verify: 'checkDeviceAssignedToApplication' }
        )
        // Send link-call response messages back to source instance
        // app owned devices not supported at this time
        // - ff/v1/<team>/p/+/res/+/#
        app.comms.aclManager.addACL(
            'device',
            'pub',
            { topic: /^ff\/v1\/([^/]+)\/p\/([^/]{11,})\/res\/[^/]+($|\/.*$)/, verify: 'checkDeviceCanAccessProject' }
        )
    }
}
