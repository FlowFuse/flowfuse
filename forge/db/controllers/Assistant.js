const { default: axios } = require('axios')

module.exports = {
    /**
     * Invokes a Language Learning Model (LLM) service with the specified method and payload.
     *
     * @async
     * @function
     * @param {Object} app @ignore - The application instance containing configuration details.
     * @param {string} method - The API endpoint method to call on the LLM service.
     * @param {Object} payload - The request payload to be sent to the LLM.
     * @param {Object} options - An optional object containing configurations for the request.
     * @param {string} options.teamHashId - The unique identifier for the team.
     * @param {Object} [options.additionalHeaders={}] - Additional headers to be included in the request.
     * @param {string} options.instanceType - The type of instance making the request.
     * @param {string} options.instanceId - The unique identifier for the instance.
     * @param {boolean} [options.isTeamOnTrial] - Indicator if the team is currently on trial.
     * @returns {Promise<Object>} Resolves with the response data from the LLM service.
     * @throws {Error} Throws an error if there is a transaction ID mismatch in the response.
     */
    invokeLLM: async (app, method, payload, {
        teamHashId,
        additionalHeaders = { },
        instanceType,
        instanceId,
        isTeamOnTrial = undefined
    }) => {
        const timeout = app.config.assistant?.service?.requestTimeout || 60000
        const serviceUrl = app.config.assistant?.service?.url
        const url = `${serviceUrl.replace(/\/+$/, '')}/${method.replace(/^\/+/, '')}`

        const headers = await module.exports.buildRequestHeaders(app, additionalHeaders, {
            isTeamOnTrial,
            instanceType,
            instanceId,
            teamHashId
        })

        const response = await axios.post(url, payload, { headers, timeout })

        if (payload.transactionId !== response.data.transactionId) {
            throw new Error('Transaction ID mismatch') // Ensure we are responding to the correct transaction
        }
        return response.data
    },

    /**
     * Builds and returns the request headers for HTTP requests, combining application configuration, license information,
     * and additional headers as needed.
     *
     * @param {Object} app - The application object containing configuration and license details.
     * @param {Object} additionalHeaders - An object containing additional headers to include in the request.
     * @param {Object} options - Options for customizing the headers.
     * @param {string} options.instanceType - The type of owner for the request (e.g., user, team).
     * @param {string} options.instanceId - The instance ID associated with the request.
     * @param {string} options.teamHashId - The hashed team ID associated with the request.
     * @param {boolean} [options.isTeamOnTrial] - Indicates if the team is currently in a trial period.
     * @returns {Promise<Object>} A Promise */
    buildRequestHeaders: async (app, additionalHeaders, { instanceType, instanceId, teamHashId, isTeamOnTrial }) => {
        const config = app.config
        const serviceToken = config.assistant?.service?.token

        const requestHeaders = {
            'ff-owner-type': instanceType,
            'ff-owner-id': instanceId,
            'ff-team-id': teamHashId
        }
        // include license information, team id and trial status so that we can make decisions in the assistant service
        const isLicensed = app.license?.active() || false
        const licenseType = isLicensed ? (app.license.get('dev') ? 'DEV' : 'EE') : 'CE'
        const tier = isLicensed ? app.license.get('tier') : null

        requestHeaders['ff-license-active'] = isLicensed
        requestHeaders['ff-license-type'] = licenseType
        requestHeaders['ff-license-tier'] = tier

        if (isTeamOnTrial !== undefined) {
            requestHeaders['ff-team-trial'] = isTeamOnTrial
        }
        if (serviceToken) {
            requestHeaders.Authorization = `Bearer ${serviceToken}`
        }
        if (additionalHeaders.accept) {
            requestHeaders.Accept = additionalHeaders.accept
        }
        if (additionalHeaders['user-agent']) {
            requestHeaders['User-Agent'] = additionalHeaders['user-agent']
        }

        return requestHeaders
    }
}
