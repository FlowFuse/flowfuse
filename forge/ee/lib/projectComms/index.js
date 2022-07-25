module.exports.init = function (app) {
    if (app.comms) {
        // Set the feature flag
        app.config.features.register('projectComms', true, false)

        // Register the broker comms ACLs for inter-project communication

        // Project ACL

        // Receive broadcasts from other projects in the team
        // - ff/v1/<team>/p/+/out/+/#
        app.comms.aclManager.addACL(
            'project',
            'sub',
            { topic: /^ff\/v1\/([^/]+)\/p\/[^/]+\/out\/[^/]+($|\/.*$)/, verify: 'checkTeamId' }
        )
        // Receive messages sent to this project
        // - ff/v1/<team>/p/<project>/in/+/#
        app.comms.aclManager.addACL(
            'project',
            'sub',
            { topic: /^ff\/v1\/([^/]+)\/p\/([^/]+)\/in\/[^/]+($|\/.*$)$/, verify: 'checkTeamAndObjectIds' }
        )
        // Send message to other project
        // - ff/v1/<team>/p/+/in/+/#
        app.comms.aclManager.addACL(
            'project',
            'pub',
            { topic: /^ff\/v1\/([^/]+)\/p\/[^/]+\/in\/[^/]+($|\/.*$)/, verify: 'checkTeamId' }
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
            { topic: /^ff\/v1\/([^/]+)\/p\/([^/]+)\/out\/[^/]+($|\/.*$)/, verify: 'checkDeviceCanAccessProject' }
        )
        // Receive messages sent to this project
        // - ff/v1/<team>/p/<project>/in/+/#
        app.comms.aclManager.addACL(
            'device',
            'sub',
            { topic: /^ff\/v1\/([^/]+)\/p\/([^/]+)\/in\/[^/]+($|\/.*$)$/, verify: 'checkDeviceAssignedToProject' }
        )

        // Send message to other project
        // - ff/v1/<team>/p/+/in/+/#
        app.comms.aclManager.addACL(
            'device',
            'pub',
            { topic: /^ff\/v1\/([^/]+)\/p\/([^/]+)\/in\/[^/]+($|\/.*$)/, verify: 'checkDeviceCanAccessProject' }
        )
        // Send broadcast messages
        // - ff/v1/<team>/p/<project>/out/+/#
        app.comms.aclManager.addACL(
            'device',
            'pub',
            { topic: /^ff\/v1\/([^/]+)\/p\/([^/]+)\/out\/[^/]+($|\/.*$)/, verify: 'checkDeviceAssignedToProject' }
        )
    }
}
