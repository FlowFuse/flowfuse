module.exports.init = async function (app) {
    // Set the SSO feature flag
    app.config.features.register('sso', true, true)

    /**
     * A temporary hardcoded list of SAML configurations.
     * This will eventually either come from .yml or via a db table
     */
    const PROVIDERS = {
        // provider1: {
        //     id: 'provider1',
        //     domainFilter: '^.*@flowforge.com$',
        //     options: {
        //         // callbackUrl:
        //         issuer: '',
        //         entryPoint: '',
        //         cert: ''
        //     }
        // }
    }

    async function getProviderOptions (id) {
        if (PROVIDERS[id]) {
            const opts = { ...PROVIDERS[id].options }
            if (!opts.callbackUrl && !opts.path) {
                opts.path = '/ee/sso/login/callback'
            }
            if (!opts.issuer) {
                opts.issuer = app.config.base_url + (app.config.base_url.endsWith('/') ? '' : '/') + '/ee/sso/login/callback'
            }
            return opts
        }
        return null
    }

    async function getProviderForEmail (email) {
        for (const [key, value] of Object.entries(PROVIDERS)) {
            const RE = new RegExp(value.domainFilter, 'i')
            if (RE.test(email)) {
                return key
            }
        }
        return null
    }

    async function isSSOEnabledForEmail (email) {
        return !!(await getProviderForEmail(email))
    }

    async function getProviderList () {
        return Object.values(PROVIDERS)
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
        getProviderForEmail,
        getProviderList
    }
}
