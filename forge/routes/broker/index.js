/**
 * Broker authentication backend
 *
 * - /api/broker
 *
 */

module.exports = async function (app) {
    async function checkTeamAndObjectIds (match, ids) {
        // match = [ _ , <teamid>, <projectid> ]
        // ids = [ 'project', <teamid>, <projectid> ]
        return match[1] === ids[1] && match[2] === ids[2]
    }

    async function checkTeamId (match, ids) {
        // match = [ _ , <teamid> ]
        // ids = [ 'project', <teamid>, <projectid> ]
        return match[1] === ids[1]
    }

    async function checkDeviceAssignedToProject (match, ids) {
        // match = [ _ , <teamid>, <projectid> ]
        // ids = [ 'device', <teamid>, <deviceid> ]

        // Do the simple team id check
        if (match[1] !== ids[1]) {
            return false
        }
        // Get the project this device is assigned to and check it matches
        const assignedProject = await app.db.models.Device.getDeviceProjectId(ids[2])
        return assignedProject && assignedProject === match[2]
    }

    async function checkDeviceCanAccessProject (match, ids) {
        // match = [ _ , <teamid>, <projectid> ]
        // ids = [ 'device', <teamid>, <deviceid> ]

        // Do the simple team id check
        if (match[1] !== ids[1]) {
            return false
        }
        // Get the project this device is assigned to
        const assignedProject = await app.db.models.Device.getDeviceProjectId(ids[2])
        if (!assignedProject) {
            return false
        }
        if (assignedProject === match[2]) {
            // Access the project we're assigned to - all good
            return true
        }

        // Need to check if this project is in the same team.
        const projectTeamId = await app.db.models.Project.getProjectTeamId(match[2])
        return projectTeamId && app.db.models.Team.encodeHashid(projectTeamId) === match[1]
    }

    const ACLS = {
        forge_platform: {
            sub: [
                // Receive status events from project launchers
                // - ff/v1/+/p/+/status
                { topic: /^ff\/v1\/[^/]+\/p\/[^/]+\/status$/ },
                // Receive status events from devices
                // - ff/v1/+/d/+/status
                { topic: /^ff\/v1\/[^/]+\/d\/[^/]+\/status$/ }
            ],
            pub: [
                // Send commands to project launchers
                // - ff/v1/+/p/+/command
                { topic: /^ff\/v1\/[^/]+\/p\/[^/]+\/command$/ },
                // Send commands to devices
                // - ff/v1/+/d/+/command
                { topic: /^ff\/v1\/[^/]+\/d\/[^/]+\/command$/ }
            ]
        },
        project: {
            sub: [
                // Receive commands from the platform
                // - ff/v1/<team>/p/<project>/command
                { topic: /^ff\/v1\/([^/]+)\/p\/([^/]+)\/command$/, verify: checkTeamAndObjectIds },
                // Receive broadcasts from other projects in the team
                // - ff/v1/<team>/p/+/out/+/#
                { topic: /^ff\/v1\/([^/]+)\/p\/[^/]+\/out\/[^/]+($|\/.*$)/, verify: checkTeamId },
                // Receive messages sent to this project
                // - ff/v1/<team>/p/<project>/in/+/#
                { topic: /^ff\/v1\/([^/]+)\/p\/([^/]+)\/in\/[^/]+($|\/.*$)$/, verify: checkTeamAndObjectIds }
            ],
            pub: [
                // Send status to the platform
                // - ff/v1/<team>/p/<project>/status
                { topic: /^ff\/v1\/([^/]+)\/p\/([^/]+)\/status$/, verify: checkTeamAndObjectIds },
                // Send message to other project
                // - ff/v1/<team>/p/+/in/+/#
                { topic: /^ff\/v1\/([^/]+)\/p\/[^/]+\/in\/[^/]+($|\/.*$)/, verify: checkTeamId },
                // Send broadcast messages
                // - ff/v1/<team>/p/<project>/out/+/#
                { topic: /^ff\/v1\/([^/]+)\/p\/([^/]+)\/out\/[^/]+($|\/.*$)/, verify: checkTeamAndObjectIds }
            ]
        },
        device: {
            sub: [
                // Receive commands from the platform
                // - ff/v1/<team>/d/<device>/command
                { topic: /^ff\/v1\/([^/]+)\/d\/([^/]+)\/command$/, verify: checkTeamAndObjectIds },
                // Receive broadcasts from other projects in the team
                // - ff/v1/<team>/p/+/out/+/#
                { topic: /^ff\/v1\/([^/]+)\/p\/([^/]+)\/out\/[^/]+($|\/.*$)/, verify: checkDeviceCanAccessProject },
                // Receive messages sent to this project
                // - ff/v1/<team>/p/<project>/in/+/#
                { topic: /^ff\/v1\/([^/]+)\/p\/([^/]+)\/in\/[^/]+($|\/.*$)$/, verify: checkDeviceAssignedToProject }
            ],
            pub: [
                // Send status to the platform
                // - ff/v1/<team>/d/<device>/status
                { topic: /^ff\/v1\/([^/]+)\/d\/([^/]+)\/status$/, verify: checkTeamAndObjectIds },
                // Send message to other project
                // - ff/v1/<team>/p/+/in/+/#
                { topic: /^ff\/v1\/([^/]+)\/p\/([^/]+)\/in\/[^/]+($|\/.*$)/, verify: checkDeviceCanAccessProject },
                // Send broadcast messages
                // - ff/v1/<team>/p/<project>/out/+/#
                { topic: /^ff\/v1\/([^/]+)\/p\/([^/]+)\/out\/[^/]+($|\/.*$)/, verify: checkDeviceAssignedToProject }
            ]
        }
    }

    app.post('/auth-client', {
        schema: {
            body: {
                type: 'object',
                required: ['clientid', 'password', 'username'],
                properties: {
                    clientid: { type: 'string' },
                    password: { type: 'string' },
                    username: { type: 'string' }
                }
            }
        }
    }, async (request, response) => {
        const isValid = await app.db.controllers.BrokerClient.authenticateCredentials(
            request.body.username,
            request.body.password
        )
        if (isValid) {
            response.status(200).send()
        } else {
            response.status(401).send()
        }
    })

    app.post('/auth-acl', {
        schema: {
            body: {
                type: 'object',
                required: ['acc', 'clientid', 'topic', 'username'],
                properties: {
                    clientid: { type: 'string' },
                    username: { type: 'string' },
                    topic: { type: 'string' },
                    acc: { type: 'number' }
                }
            }
        }
    }, async (request, response) => {
        // Three types of client
        // - forge_platform
        // - project:<teamid>:<projectid>
        // - device:<teamid>:<deviceid>

        let allowed = false
        let aclList = []
        const aclType = request.body.acc === 2 ? 'pub' : 'sub'
        if (request.body.username === 'forge_platform') {
            aclList = ACLS[request.body.username][aclType]
        } else if (/^project:/.test(request.body.username)) {
            aclList = ACLS.project[aclType]
        } else if (/^device:/.test(request.body.username)) {
            aclList = ACLS.device[aclType]
        }
        const l = aclList.length
        for (let i = 0; i < l; i++) {
            const m = aclList[i].topic.exec(request.body.topic)
            if (m) {
                if (aclList[i].verify) {
                    allowed = await aclList[i].verify(m, request.body.username.split(':'))
                } else {
                    allowed = true
                }
                break
            }
        }
        if (allowed) {
            response.status(200).send()
        } else {
            response.status(401).send()
        }
    })

    // app.get('/test', async (request, response) => {
    //     const project = await app.db.models.Project.byId('ac8e4995-cb47-42ec-a9a4-71c42366c7f3')
    //     const creds = await app.db.controllers.BrokerClient.createClientForProject(project)
    //     // const device = await app.db.models.Device.byId(1)
    //     // const creds = await app.db.controllers.BrokerClient.createClientForDevice(device)
    //     response.send(creds)
    // })
}
