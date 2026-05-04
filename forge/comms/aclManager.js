/**
 * This module provides functions to verify whether a broker ACL request
 * is valid or not.
 *
 * It includes the core (CE) ACLs for basic launcher/device command/status messages.
 *
 * Other components (ie EE-specific features) can register their own additional ACLs
 */
module.exports = function (app) {
    const expertRbacToolCheck = async (teamMembership, application, toolName) => {
        const applicationHash = typeof application === 'object' ? application.hashid : application
        if (toolName === 'expert:status-message') {
            return true
        }
        // TODO: Understand all automations and which permissions they should require.
        // For now, basic starter automations are added here, any not matching this list will require project:flows:edit permission
        const toolAccessPermission = {
            'automation:select-nodes': 'project:flows:view',
            'automation:get-nodes': 'project:flows:view',
            'automation:get-flows': 'project:flows:view'
        }
        const requiredPermission = toolAccessPermission[toolName] || 'project:flows:edit' // default to highest level of access if tool isn't in the list, to be safe
        if (!app.hasPermission(teamMembership, requiredPermission, { applicationId: applicationHash })) {
            return false
        }
        return true
    }

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
        },
        checkExpertTopic: async function (topicParts, usernameParts, acl) {
            // topicParts = [ fullTopic , <userid>, <sessionid>, <entityType>, <entityId> [, <inflightType>] ]
            // usernameParts = [ 'expert-client' | 'expert-agent', <userid> [, <sessionid>] ]
            // acl = { channel: 'inflight'|'chat', isPub: true/false, isSub: true/false, isClient: true/false, isAgent: true/false, allowWildcard: { user: true/false, session: true/false, entity: true/false } }

            const ValidationError = function (message) {
                const error = new Error(message)
                error.name = 'ACLValidationError'
                return error
            }

            try {
                const [, userId, sessionId, entityType, entityId, inflightType] = topicParts
                const [clientType, usernameUserId, usernameSessionId] = usernameParts

                const isInflight = acl.channel === 'inflight'
                const isChat = acl.channel === 'chat'
                const validateUserMatch = acl.isClient
                const validateUserExists = acl.isClient || (acl.isAgent && acl.isPub)
                const validateSession = acl.isClient

                // ensure correct selected acl for the client
                if (acl.isAgent && clientType !== 'expert-agent') {
                    throw ValidationError('invalid client type - expected an expert-agent client')
                } else if (!acl.isAgent && clientType !== 'expert-client') {
                    throw ValidationError('invalid client type - expected an expert-client client')
                }

                // ensure topic part count is valid for the type of subscription
                if (isInflight && topicParts.length !== 6) {
                    throw ValidationError('topic is invalid')
                } else if (isChat && topicParts.length !== 5) {
                    throw ValidationError('topic is invalid')
                }

                if (!userId) {
                    throw ValidationError('invalid userId')
                }
                if (validateUserMatch && userId !== usernameUserId) {
                    throw ValidationError('userId does not match')
                }
                if (acl.allowWildcard?.user && userId === '+') {
                    // this is valid, the client is subscribing to all topics for this session
                } else if (validateUserExists) {
                    const user = await app.db.models.User.byId(userId)
                    if (!user) {
                        throw ValidationError('userId does not exist')
                    }
                }

                // at minimum, ensure session is present 8 or more chars
                if (!sessionId) {
                    throw ValidationError('invalid sessionId')
                } else {
                    if (acl.allowWildcard?.session && sessionId === '+') {
                        // this is valid for agent subs (as they service all sessions for the users)
                    } else if (validateSession && sessionId !== usernameSessionId) {
                        throw ValidationError('sessionId does not match')
                    } else if (sessionId.length < 8) {
                        throw ValidationError('invalid sessionId')
                    }
                }

                // not all inflight subscriptions require an entity, but if one is provided it must be valid
                let teamId
                let applicationHash
                let isWildcardEntity = false
                if (acl.allowWildcard?.entity && (entityType === '+' || entityId === '+')) {
                    if (entityType !== '+' && entityId !== '+') {
                        throw ValidationError('invalid entity wildcards - both entityType and entityId must be wildcarded together')
                    }
                    isWildcardEntity = true
                } else if (entityType === 'p') {
                    const project = await app.db.models.Project.byId(entityId)
                    if (!project) {
                        throw ValidationError('project does not exist')
                    } else {
                        teamId = project.TeamId
                        applicationHash = project.Application?.hashid || app.db.models.Application.encodeHashid(project.ApplicationId)
                    }
                } else if (entityType === 'd') {
                    const device = await app.db.models.Device.byId(entityId)
                    if (!device) {
                        throw ValidationError('device does not exist')
                    } else {
                        teamId = device.TeamId
                        applicationHash = device.Application?.hashid || app.db.models.Application.encodeHashid(device.ApplicationId)
                    }
                } else if (entityType === 'a') {
                    const application = await app.db.models.Application.byId(entityId)
                    if (!application) {
                        throw ValidationError('application does not exist')
                    } else {
                        teamId = application.TeamId
                        applicationHash = application.hashid
                    }
                } else if (entityType === 't') {
                    const team = await app.db.models.Team.byId(entityId)
                    if (!team) {
                        throw ValidationError('team does not exist')
                    } else {
                        teamId = team.id
                        applicationHash = null // NA
                    }
                } else {
                    throw ValidationError('invalid entity')
                }

                // must be member of a team
                if (!isWildcardEntity) {
                    const teamMembership = await app.db.models.TeamMember.getTeamMembership(userId, teamId, false)
                    if (!teamMembership) {
                        throw ValidationError('user is not a member of the team that owns this project')
                    }

                    // if this is an inflight channel messages we must validate the user has appropriate RBAC permission
                    if (isInflight) {
                        const result = await expertRbacToolCheck(teamMembership, applicationHash, inflightType)
                        if (!result) {
                            throw ValidationError('user does not have permission to access this inflight topic')
                        }
                    }
                }

                return true
            } catch (error) {
                if (error.name === 'ACLValidationError') {
                    // ↓ Useful for debugging ↓
                    // console.warn('ACL DENY:', { topicParts, usernameParts, acl, reason: error.message })
                } else {
                    // unexpected error during ACL checking - log to app
                    app.log.error('Unexpected error during ACL check', { topicParts, usernameParts, acl, error })
                }
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
                { topic: /^ff\/v1\/[^/]+\/d\/[^/]+\/logs\/heartbeat$/ },
                // ff/v1/<team>/d/<device>/resources/heartbeat
                { topic: /^ff\/v1\/[^/]+\/d\/[^/]+\/resources\/heartbeat$/ },
                // ff/v1/platform/sync
                { topic: /^ff\/v1\/platform\/sync$/ },
                // ff/v1/platform/leader
                { topic: /^ff\/v1\/platform\/leader$/ }
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
                { topic: /^ff\/v1\/[^/]+\/a\/[^/]+\/command$/ },
                // ff/v1/platform/sync
                { topic: /^ff\/v1\/platform\/sync$/ },
                // ff/v1/platform/leader
                { topic: /^ff\/v1\/platform\/leader$/ }
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
                { topic: /^ff\/v1\/([^/]+)\/d\/([^/]+)\/response(\/[^/]+)?$/, verify: 'checkTeamAndObjectIds' },
                // - ff/v1/<team>/d/<device/resources
                { topic: /^ff\/v1\/([^/]+)\/d\/([^/]+)\/resources$/, verify: 'checkTeamAndObjectIds' }
            ]
        },
        frontend: {
            // TODO check the verify function is safe
            sub: [
                // - ff/v1/<team>/d/<device/logs
                { topic: /^ff\/v1\/([^/]+)\/d\/([^/]+)\/logs$/, verify: 'checkDeviceIsAssigned' },
                // - ff/v1/<team>/d/<device/resources
                { topic: /^ff\/v1\/([^/]+)\/d\/([^/]+)\/resources$/, verify: 'checkDeviceIsAssigned' }
            ],
            pub: [
                // - ff/v1/<team>/d/<device/logs/heartbeat
                { topic: /^ff\/v1\/([^/]+)\/d\/([^/]+)\/logs\/heartbeat$/, verify: 'checkDeviceIsAssigned' },
                // - ff/v1/<team>/d/<device/resources/heartbeat
                { topic: /^ff\/v1\/([^/]+)\/d\/([^/]+)\/resources\/heartbeat$/, verify: 'checkDeviceIsAssigned' }
            ]
        },
        // frontend client (user)
        expertClient: {
            sub: [
                // topic: ff/v1/expert/<userid>/<sessionid>/<a|p|d|t>/<appid|projid|devid|teamid>/support/chat/response
                // topic captures, 0 = full topic, 1 = userid, 2 = sessionid, 3 = entity type (a|p|d|t), 4 = entity id, 5 = inflight type (only for inflight topics)
                // example topic: ff/v1/expert/user123/session123/p/abc-123-456-789/support/chat/response
                { topic: /^ff\/v1\/expert\/([^/]+)\/([^/]+)\/([^/]+)\/([^/]+)\/support\/chat\/response$/, verify: 'checkExpertTopic', channel: 'chat', allowWildcard: { entity: true }, isClient: true, isSub: true },
                { topic: /^ff\/v1\/expert\/([^/]+)\/([^/]+)\/([^/]+)\/([^/]+)\/support\/inflight\/([^/]+)\/request$/, verify: 'checkExpertTopic', channel: 'inflight', allowWildcard: { entity: true, inflightType: true }, isClient: true, isSub: true }
            ],
            pub: [
                // topic: ff/v1/expert/<userid>/<sessionid>/<a|p|d|t>/<appid|projid|devid|teamid>/support/chat/request
                // topic captures, 0 = full topic, 1 = userid, 2 = sessionid, 3 = entity type (a|p|d|t), 4 = entity id, 5 = inflight type (only for inflight topics)
                // example topic: ff/v1/expert/user123/session123/p/abc-111-222-333/support/chat/request
                { topic: /^ff\/v1\/expert\/([^/]+)\/([^/]+)\/([tapd])\/([^/]+)\/support\/chat\/request$/, verify: 'checkExpertTopic', channel: 'chat', isClient: true, isPub: true },
                { topic: /^ff\/v1\/expert\/([^/]+)\/([^/]+)\/([tapd])\/([^/]+)\/support\/inflight\/([^/]+)\/response$/, verify: 'checkExpertTopic', channel: 'inflight', isClient: true, isPub: true }
            ]
        },
        // backend client (agent)
        expertAgent: {
            sub: [
                { topic: /^ff\/v1\/expert\/([^/]+)\/([^/]+)\/([^/]+)\/([^/]+)\/support\/chat\/request$/, verify: 'checkExpertTopic', channel: 'chat', allowWildcard: { user: true, session: true, entity: true }, isAgent: true, isSub: true },
                { topic: /^ff\/v1\/expert\/([^/]+)\/([^/]+)\/([^/]+)\/([^/]+)\/support\/inflight\/([^/]+)\/response$/, verify: 'checkExpertTopic', channel: 'inflight', allowWildcard: { user: true, session: true, entity: true, inflightType: true }, isAgent: true, isSub: true }
            ],
            pub: [
                { topic: /^ff\/v1\/expert\/([^/]+)\/([^/]+)\/([^/]+)\/([^/]+)\/support\/chat\/response$/, verify: 'checkExpertTopic', channel: 'chat', isAgent: true, isPub: true },
                { topic: /^ff\/v1\/expert\/([^/]+)\/([^/]+)\/([^/]+)\/([^/]+)\/support\/inflight\/([^/]+)\/request$/, verify: 'checkExpertTopic', channel: 'inflight', isAgent: true, isPub: true }
            ]
        }
    }

    return {
        verify: async function (username, topic, accessLevel) {
            // Types of client
            // - forge_platform
            // - project:<teamid>:<projectid>
            // - device:<teamid>:<deviceid>
            // - frontend:<teamid>:<deviceid>
            // - expert-client:<userid>:<sessionid>
            // - expert-agent:<userid>:<apiversion>

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
            } else if (/^expert-agent:/.test(username)) {
                aclList = ACLS.expertAgent[aclType]
            } else if (/^expert-client:/.test(username)) {
                aclList = ACLS.expertClient[aclType]
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
                            try {
                                allowed = await verifyFunctions[acl.verify](m, usernameParts, acl)
                            } catch (err) {
                                allowed = false
                                app.log.error('Error in ACL verify function', { error: err, topic, username, acl })
                            }
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
