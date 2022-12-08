module.exports.init = async function (app) {
    // Set the SSO feature flag
    app.config.features.register('sso', true, true)

    /**
     * Handle a request POST /account/login to see if SSO should be triggered
     *
     * Currently always returns false as SSO is not fully enabled
     *
     * @returns whether the request has been handled or not
     */
    async function handleLoginRequest (request, reply) {
        return false
    }

    return {
        handleLoginRequest
    }
}
