/**
 * This module provides functions to verify whether a broker ACL request
 * is valid or not.
 *
 * It includes the core (CE) ACLs for basic launcher/device command/status messages.
 *
 * Other components (ie EE-specific features) can register their own additional ACLs
 */
module.exports = function (app) {
    // Standard set of verify functions to ensure the request meets particular criteria
    const verifyFunctions = {
        checkTeamAndObjectIds: async function (requestParts, ids) {
            // requestParts = [ _ , <teamid>, <projectid> ]
            // ids = [ 'project', <teamid>, <projectid> ]
            return requestParts[1] === ids[1] && requestParts[2] === ids[2]
        },
        checkTeamId: async function (requestParts, ids) {
            // requestParts = [ _ , <teamid> ]
            // ids = [ 'project', <teamid>, <projectid> ]
            return requestParts[1] === ids[1]
        },
        checkDeviceIsAssigned: async function (requestParts, ids, acl) {
            // requestParts = [ _ , <teamid>, <projectid> ] or [ _ , <teamid>, <deviceid> ]
            // ids = [ 'device', <teamid>, <deviceid> ]

            // Do the simple team id check
            if (requestParts[1] !== ids[1]) {
                return false // not in this team
            }

            if (acl.deviceOwnerType === 'application') {
                if (requestParts[2] !== ids[2]) {
                    return false // not owned by this application
                }
            }

            // check to see if the device is assigned to something?
            const assignedTo = await app.db.models.Device.getOwnerTypeAndId(ids[2])
            if (assignedTo && assignedTo.ownerType && assignedTo.ownerId) {
                return true
            }
            return false
        },
        checkDeviceAssignedToProject: async function (requestParts, ids) {
            // requestParts = [ _ , <teamid>, <projectid> ]
            // ids = [ 'device', <teamid>, <deviceid> ]

            // Do the simple team id check
            if (requestParts[1] !== ids[1]) {
                return false
            }
            // Get the project this device is assigned to and check it matches
            const assignedProject = await app.db.models.Device.getDeviceProjectId(ids[2])
            return assignedProject && assignedProject === requestParts[2]
        },
        checkDeviceAssignedToApplication: async function (requestParts, ids) {
            // requestParts = [ _ , <teamid>, <deviceid> ]
            // ids = [ 'device', <teamid>, <applicationid> ]

            // Do the simple team id check
            if (requestParts[1] !== ids[1]) {
                return false
            }
            // Get the application this device is assigned to and check it matches
            const assignedApplication = await app.db.models.Device.getDeviceApplicationId(ids[2])
            return assignedApplication && assignedApplication === requestParts[2]
        },
        checkDeviceCanAccessProject: async function (requestParts, ids) {
            // requestParts = [ _ , <teamid>, <projectid> ]
            // ids = [ 'device', <teamid>, <deviceid> ]

            // Do the simple team id check
            if (requestParts[1] !== ids[1]) {
                return false
            }
            // check to see if the device is assigned to something?
            const assignedTo = await app.db.models.Device.getOwnerTypeAndId(ids[2])
            if (!assignedTo?.ownerType || !assignedTo?.ownerId) {
                return false
            }
            // If the device is assigned to a project and that matches the request project - all good
            if (assignedTo.ownerType === 'instance') {
                if (assignedTo.ownerId === requestParts[2]) {
                    // Access the project we're assigned to - all good
                    return true
                }
            }

            try {
                // Need to check if this project is in the same team.
                const projectTeamId = await app.db.models.Project.getProjectTeamId(requestParts[2])
                return projectTeamId && app.db.models.Team.encodeHashid(projectTeamId) === requestParts[1]
            } catch (err) {
                // Any error likely means requestParts[2] isn't a valid uuid - which
                // postgres with throw over, unlike sqlite that returns no results.
                return false
            }
        }
    }

    const SHARED_SUB = /^\$share\/([^/]+)\/(.*)$/

    const ACLS = {
        forge_platform: {
            sub: [
                // Receive status events from project launchers
                // - ff/v1/<team>/l/<instance>/status
                { topic: /^ff\/v1\/[^/]+\/l\/[^/]+\/status$/, shared: true },
                // Receive status events, logs and command responses from devices
                // - ff/v1/<team>/d/<device>/status
                { topic: /^ff\/v1\/[^/]+\/d\/[^/]+\/status$/, shared: true },
                // - ff/v1/<team>/d/<device>/logs
                { topic: /^ff\/v1\/[^/]+\/d\/[^/]+\/logs$/ },
                // Receive broadcast response notification
                { topic: /^ff\/v1\/[^/]+\/d\/[^/]+\/response(\/[^/]+)?$/ },
                // ff/v1/<team>/d/<device>/logs/heartbeat
                { topic: /^ff\/v1\/[^/]+\/d\/[^/]+\/logs\/heartbeat$/ }
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
                { topic: /^ff\/v1\/[^/]+\/p\/[^/]+\/command$/ },
                // Send commands to all application-assigned devices
                // - ff/v1/+/a/+/command
                { topic: /^ff\/v1\/[^/]+\/a\/[^/]+\/command$/ }
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
                // Device when owned by a project, receive commands from the platform - broadcast
                // - ff/v1/<team>/p/<project>/command
                { topic: /^ff\/v1\/([^/]+)\/p\/([^/]+)\/command$/, verify: 'checkDeviceAssignedToProject' },
                //  Device when owned by an application, receive commands from the platform - broadcast
                // - ff/v1/<team>/a/<application>/command
                { topic: /^ff\/v1\/([^/]+)\/a\/([^/]+)\/command$/, verify: 'checkDeviceAssignedToApplication' }
            ],
            pub: [
                // Send status, logs and command responses to the platform
                // - ff/v1/<team>/d/<device>/status
                { topic: /^ff\/v1\/([^/]+)\/d\/([^/]+)\/status$/, verify: 'checkTeamAndObjectIds' },
                // - ff/v1/<team>/d/<device/logs
                { topic: /^ff\/v1\/([^/]+)\/d\/([^/]+)\/logs$/, verify: 'checkTeamAndObjectIds' },
                // - ff/v1/<team>/d/<device>/response[/<instance>]
                { topic: /^ff\/v1\/([^/]+)\/d\/([^/]+)\/response(\/[^/]+)?$/, verify: 'checkTeamAndObjectIds' }
            ]
        },
        frontend: {
            // TODO check the verify function is safe
            sub: [
                // - ff/v1/<team>/d/<device/logs
                { topic: /^ff\/v1\/([^/]+)\/d\/([^/]+)\/logs$/, verify: 'checkDeviceIsAssigned' }
            ],
            pub: [
                // - ff/v1/<team>/d/<device/logs/heartbeat
                { topic: /^ff\/v1\/([^/]+)\/d\/([^/]+)\/logs\/heartbeat$/, verify: 'checkDeviceIsAssigned' }
            ]
        }
    }

    return {
        verify: async function (username, topic, accessLevel) {
            // Four types of client
            // - forge_platform
            // - project:<teamid>:<projectid>
            // - device:<teamid>:<deviceid>
            // - frontend:<teamid>:<deviceid>

            let allowed = false
            let aclList = []
            // accessLevel 1=SUB 2=PUB 3=WRITE
            // We do not distinguish between SUB & WRITE
            const aclType = accessLevel === 2 ? 'pub' : 'sub'
            // Pick the appropriate ACL list based on username/accessLevel
            if (username === 'forge_platform') {
                aclList = ACLS[username][aclType]
            } else if (/^project:/.test(username)) {
                aclList = ACLS.project[aclType]
            } else if (/^device:/.test(username)) {
                aclList = ACLS.device[aclType]
            } else if (/^frontend:/.test(username)) {
                aclList = ACLS.frontend[aclType]
            } else {
                return false
            }
            const l = aclList.length
            if (l > 0) {
                const usernameParts = username.split(':')
                let isSharedSub = false
                if (aclType === 'sub') {
                    // Check for a shared subscription
                    const sharedSubParts = SHARED_SUB.exec(topic)
                    if (sharedSubParts) {
                        isSharedSub = true
                        // This is a shared sub - validate the share group name
                        const shareGroup = sharedSubParts[1]
                        if (shareGroup !== 'platform' && shareGroup !== usernameParts[2]) {
                            return false
                        }
                        topic = sharedSubParts[2]
                    }
                }
                for (let i = 0; i < l; i++) {
                    const acl = aclList[i]
                    const m = acl.topic.exec(topic)
                    if (m) {
                        if (isSharedSub && !acl.shared) {
                            // This isn't allowed to be a sharedSub
                            break
                        } else if (acl.verify && verifyFunctions[acl.verify]) {
                            allowed = await verifyFunctions[acl.verify](m, usernameParts, acl)
                            // ↓ Useful for debugging ↓
                            // if (allowed !== true) {
                            //     console.log('DENIED!', topic, acl)
                            // }
                        } else {
                            allowed = true
                        }
                        break
                    }
                }
            }
            return allowed
        },
        addACL: function (scope, action, acl) {
            ACLS[scope][action].push(acl)
        }
    }
}
