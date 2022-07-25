module.exports = function (app) {
    const verifyFunctions = {
        checkTeamAndObjectIds: async function (match, ids) {
            // match = [ _ , <teamid>, <projectid> ]
            // ids = [ 'project', <teamid>, <projectid> ]
            return match[1] === ids[1] && match[2] === ids[2]
        },
        checkTeamId: async function (match, ids) {
            // match = [ _ , <teamid> ]
            // ids = [ 'project', <teamid>, <projectid> ]
            return match[1] === ids[1]
        },
        checkDeviceAssignedToProject: async function (match, ids) {
            // match = [ _ , <teamid>, <projectid> ]
            // ids = [ 'device', <teamid>, <deviceid> ]

            // Do the simple team id check
            if (match[1] !== ids[1]) {
                return false
            }
            // Get the project this device is assigned to and check it matches
            const assignedProject = await app.db.models.Device.getDeviceProjectId(ids[2])
            return assignedProject && assignedProject === match[2]
        },
        checkDeviceCanAccessProject: async function (match, ids) {
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
    }

    const ACLS = {
        forge_platform: {
            sub: [
                // Receive status events from project launchers
                // - ff/v1/+/l/+/status
                { topic: /^ff\/v1\/[^/]+\/l\/[^/]+\/status$/ },
                // Receive status events from devices
                // - ff/v1/+/d/+/status
                { topic: /^ff\/v1\/[^/]+\/d\/[^/]+\/status$/ }
            ],
            pub: [
                // Send commands to project launchers
                // - ff/v1/+/l/+/command
                { topic: /^ff\/v1\/[^/]+\/l\/[^/]+\/command$/ },
                // Send commands to devices
                // - ff/v1/+/d/+/command
                { topic: /^ff\/v1\/[^/]+\/d\/[^/]+\/command$/ },
                // Send commands to all project-assigned devices
                // - ff/v1/+/p/+/command
                { topic: /^ff\/v1\/[^/]+\/p\/[^/]+\/command$/ }
            ]
        },
        project: {
            sub: [
                // Receive commands from the platform
                // - ff/v1/<team>/l/<project>/command
                { topic: /^ff\/v1\/([^/]+)\/l\/([^/]+)\/command$/, verify: 'checkTeamAndObjectIds' }
            ],
            pub: [
                // Send status to the platform
                // - ff/v1/<team>/l/<project>/status
                { topic: /^ff\/v1\/([^/]+)\/l\/([^/]+)\/status$/, verify: 'checkTeamAndObjectIds' }
            ]
        },
        device: {
            sub: [
                // Receive commands from the platform
                // - ff/v1/<team>/d/<device>/command
                { topic: /^ff\/v1\/([^/]+)\/d\/([^/]+)\/command$/, verify: 'checkTeamAndObjectIds' },
                // Receive commands from the platform - broadcast
                // - ff/v1/<team>/p/<project>/command
                { topic: /^ff\/v1\/([^/]+)\/p\/([^/]+)\/command$/, verify: 'checkDeviceAssignedToProject' }
            ],
            pub: [
                // Send status to the platform
                // - ff/v1/<team>/d/<device>/status
                { topic: /^ff\/v1\/([^/]+)\/d\/([^/]+)\/status$/, verify: 'checkTeamAndObjectIds' }
            ]
        }
    }

    return {
        verify: async function (username, topic, accessLevel) {
            // Three types of client
            // - forge_platform
            // - project:<teamid>:<projectid>
            // - device:<teamid>:<deviceid>

            let allowed = false
            let aclList = []
            const aclType = accessLevel === 2 ? 'pub' : 'sub'
            if (username === 'forge_platform') {
                aclList = ACLS[username][aclType]
            } else if (/^project:/.test(username)) {
                aclList = ACLS.project[aclType]
            } else if (/^device:/.test(username)) {
                aclList = ACLS.device[aclType]
            }
            const l = aclList.length
            for (let i = 0; i < l; i++) {
                const m = aclList[i].topic.exec(topic)
                if (m) {
                    if (aclList[i].verify && verifyFunctions[aclList[i].verify]) {
                        allowed = await verifyFunctions[aclList[i].verify](m, username.split(':'))
                    } else {
                        allowed = true
                    }
                    break
                }
            }
            return allowed
        },
        addACL: function (scope, action, acl) {
            ACLS[scope][action].push(acl)
        }
    }
}
