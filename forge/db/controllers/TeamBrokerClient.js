const { compareHash, parseNrMqttId } = require('../utils')

module.exports = {

    authenticateCredentials: async function (app, username, password) {
        const parts = username.split('@')
        if (parts.length === 2) {
            const user = await app.db.models.TeamBrokerClient.byUsername(parts[0], parts[1])
            if (!user) {
                return false
            }

            if (user.Team.suspended) {
                return false
            }

            await user.Team.ensureTeamTypeExists()
            if (!user.Team.getFeatureProperty('teamBroker')) {
                return false
            }

            if (!password || password.length > 128) {
                return false
            }

            if (compareHash(password, user.password)) {
                return true
            }
        }

        return false
    },

    authenticateNrMqttNodeUser: async function (app, authId, clientId, password) {
        // Basic checks
        if (!password || password.length > 128) {
            return false
        }

        const parsedUsername = parseNrMqttId(authId, 'username')
        const parsedClientId = parseNrMqttId(clientId, 'clientId')
        let clientIdValid = false
        if (!parsedUsername.valid || !parsedClientId.valid) {
            return false
        }

        // Check if the clientId matches the username
        if (parsedUsername.teamId !== parsedClientId.teamId ||
            parsedUsername.ownerType !== parsedClientId.ownerType ||
            parsedUsername.ownerId !== parsedClientId.ownerId) {
            return false // clientId and username must match (excluding HA ID)
        }
        if (parsedClientId.haId) {
            clientIdValid = `${authId}:${parsedClientId.haId}` === clientId
        } else {
            clientIdValid = authId === clientId
        }
        if (!clientIdValid) {
            return false // clientId must match the username
        }

        // get the user and validate its settings and password
        const teamBrokerClient = await app.db.models.TeamBrokerClient.byUsername(parsedClientId.username, parsedClientId.teamId, true, true)
        if (!teamBrokerClient) {
            return false
        }
        if (teamBrokerClient.ownerType !== parsedUsername.ownerType) { // project or device
            return false
        }
        if (teamBrokerClient.ownerType === 'device') {
            if (teamBrokerClient.Device?.hashid !== parsedUsername.ownerId) {
                return false
            }
        } else if (teamBrokerClient.ownerType === 'project') {
            if (teamBrokerClient.Project?.id !== parsedUsername.ownerId) {
                return false
            }
        }
        if (teamBrokerClient.Team.suspended) {
            return false
        }

        await teamBrokerClient.Team.ensureTeamTypeExists()
        if (!teamBrokerClient.Team.getFeatureProperty('teamBroker')) {
            return false
        }
        if (!compareHash(password, teamBrokerClient.password)) {
            return false
        }
        return {
            username: parsedClientId.username,
            teamId: teamBrokerClient.Team.hashid,
            clientIdValid
        }
    },

    /**
     * Update the MQTT password for the linked NR MQTT node team client user (if it exists)
     * @param {*} app - the app instance
     * @param {*} teamId - the team ID this client belongs to
     * @param {'instance'|'device'} ownerType - the owner type (e.g. 'instance', 'device')
     * @param {string} ownerId - the owner ID (e.g. project ID or device HASHID)
     * @param {string} password - the new password
     * @returns {boolean} - true if the password was updated, false if the user does not exist
     * @throws {Error} - if user is found but it fails to update/save
     */
    updateNtMqttNodeUserPassword: async function (app, teamId, ownerType, ownerId, password) {
        if (ownerType === 'project') {
            ownerType = 'instance'
        }
        const username = `${ownerType}:${ownerId}`
        const existingClient = await app.db.models.TeamBrokerClient.byUsername(username, teamId)
        if (existingClient) {
            existingClient.password = password
            await existingClient.save()
            return true
        }
        return false
    }
}
