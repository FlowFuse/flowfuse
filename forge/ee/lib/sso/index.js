module.exports.init = async function (app) {
    // Set the SSO feature flag
    app.config.features.register('sso', true, true)

    async function getProviderOptions (id) {
        const provider = await app.db.models.SAMLProvider.byId(id)
        if (provider) {
            const result = { ...provider.getOptions() }
            return result
        }
        return null
    }

    async function getProviderForEmail (email) {
        const provider = await app.db.models.SAMLProvider.forEmail(email)
        if (provider) {
            return provider.hashid
        }
        return null
    }

    async function isSSOEnabledForEmail (email) {
        return !!(await getProviderForEmail(email))
    }

    /**
     * Handle a request POST /account/login to see if SSO should be triggered
     * @returns whether the request has been handled or not
     */
    async function handleLoginRequest (request, reply) {
        let user
        if (/@/.test(request.body.username)) {
        // Provided an email we can use to check SSO against
            user = {
                email: request.body.username
            }
        } else {
        // Looks like a username was provided - look up real user so we can
        // check if their email requires SSO
            user = await app.db.models.User.byUsernameOrEmail(request.body.username)
        }
        if (user) {
            if (await isSSOEnabledForEmail(user.email)) {
                if (request.body.username.toLowerCase() !== user.email.toLowerCase() || request.body.password) {
                    // A SSO enabled user has tried to login with their username, or have provided a password.
                    // If they are an admin, allow them to continue - we need to let admins bypass SSO so they
                    // cannot be locked out.
                    if (user.admin) {
                        return false
                    }
                    // We need them to provide just their email address to avoid
                    // us exposing their email domain
                    reply.code(401).send({ code: 'sso_required', error: 'Please login with your email address' })
                } else {
                    reply.code(401).send({ code: 'sso_required', redirect: `/ee/sso/login?u=${user.email}` })
                }
                return true
            }
        }
        return false
    }

    return {
        handleLoginRequest,
        isSSOEnabledForEmail,
        getProviderOptions,
        getProviderForEmail
    }
}
