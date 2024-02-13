module.exports = async function (app) {
    app.get('/', {
        config: { allowAnonymous: true, allowUnverifiedEmail: true },
        schema: {
            summary: 'Get platform settings',
            tags: ['Platform'],
            response: {
                200: {
                    type: 'object',
                    additionalProperties: true
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        // This isn't as clean as I'd like, but it works for now.
        //
        // We return different things depending on the user session.
        // - For a non-logged in user, the settings are those needed to present
        //   the login/signup screens
        // - For a logged in (non-admin) user, they are the settings needed to
        //   ensure the app provides suitable options to the user. For example,
        //   policy information on creating teams, inviting users
        // - For an admin user, this includes more detailed settings they are able
        //   to change via the UI

        // Logged in session user (not using an access token)
        if (request.session && request.session.User && !request.session.scope) {
            const isLicensed = app.license.active()
            const response = {
                'team:user:invite:external': app.settings.get('team:user:invite:external') && app.postoffice.enabled(),
                'team:create': app.settings.get('team:create'),
                'user:tcs-required': app.settings.get('user:tcs-required'),
                'user:tcs-url': app.settings.get('user:tcs-url'),
                'user:tcs-date': app.settings.get('user:tcs-date'),
                'user:team:trial-mode:projectType': app.settings.get('user:team:trial-mode:projectType'),
                email: app.postoffice.enabled(),
                stacks: app.containers.properties().stack || {},
                features: app.config.features.getAllFeatures(),
                base_url: app.config.base_url,
                license: app.license.status()
            }

            if (request.session.User.admin) {
                response['platform:licensed'] = isLicensed
                response['telemetry:enabled'] = app.settings.get('telemetry:enabled')
                response['user:signup'] = app.settings.get('user:signup')
                response['user:reset-password'] = app.settings.get('user:reset-password')
                response['user:team:auto-create'] = app.settings.get('user:team:auto-create')
                response['user:team:auto-create:teamType'] = app.settings.get('user:team:auto-create:teamType')
                response['user:team:auto-create:instanceType'] = app.settings.get('user:team:auto-create:instanceType')
                response.email = app.postoffice.exportSettings(true)
                response['version:forge'] = app.settings.get('version:forge')
                response['version:node'] = app.settings.get('version:node')
                response['user:team:trial-mode'] = app.settings.get('user:team:trial-mode')
                response['user:team:trial-mode:duration'] = app.settings.get('user:team:trial-mode:duration')

                // `signUpTopBanner` was added to flowforge.yml in 1.3. But to make it more flexible, 1.4 moved
                // to allow it to be set via Admin Settings. This handles the cross over between
                // the two
                if (app.config.branding?.account?.signUpTopBanner) {
                    response['branding:account:signUpTopBanner'] = app.config.branding?.account?.signUpTopBanner
                }
                // For now these are the only pieces of customisable text we have.
                // As this list grows we'll need a better strategy for managing them.
                ;[
                    'branding:account:signUpTopBanner',
                    'branding:account:signUpLeftBanner'
                ].forEach(prop => {
                    const value = app.settings.get(prop)
                    if (value) {
                        response[prop] = value
                    }
                })
                response['platform:stats:token'] = app.settings.get('platform:stats:token')
            }
            reply.send(response)
        } else {
            // This is for an unauthenticated request. Return settings related
            // to branding and the login/signup pages
            const publicSettings = {
                features: app.config.features.getPublicFeatures(),
                'user:signup': app.settings.get('user:signup') && app.postoffice.enabled(),
                'user:reset-password': app.settings.get('user:reset-password') && app.postoffice.enabled(),
                'user:tcs-required': app.settings.get('user:tcs-required') && app.postoffice.enabled(),
                'user:tcs-url': app.settings.get('user:tcs-url')
            }

            // `signUpTopBanner` was added to flowforge.yml in 1.3. But to make it more flexible, 1.4 moved
            // to allow it to be set via Admin Settings. This handles the cross over between
            // the two
            if (app.config.branding?.account?.signUpTopBanner) {
                publicSettings['branding:account:signUpTopBanner'] = app.config.branding?.account?.signUpTopBanner
            }
            // These are the only branding properties needed for the sign-up page.
            // Keeping this a separate list to those returned in the admin response
            // even if, in 1.4, they are the same set of values.
            ;[
                'branding:account:signUpTopBanner',
                'branding:account:signUpLeftBanner'
            ].forEach(prop => {
                const value = app.settings.get(prop)
                if (value) {
                    publicSettings[prop] = value
                }
            })

            if (app.config.telemetry?.frontend?.google?.tag) {
                const adwords = {
                    tag: app.config.telemetry.frontend.google.tag,
                    events: app.config.telemetry?.frontend?.google?.events
                }
                publicSettings.adwords = adwords
            }

            reply.send(publicSettings)
        }
    })

    app.put('/', {
        preHandler: app.needsPermission('settings:edit'),
        schema: {
            summary: 'Get platform settings',
            tags: ['Platform'],
            body: { type: 'object' },
            response: {
                200: {
                    $ref: 'APIStatus'
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        if (request.body) {
            const updates = new app.auditLog.formatters.UpdatesCollection()
            for (let [key, value] of Object.entries(request.body)) {
                if (key === 'user:tcs-updated') {
                    key = 'user:tcs-date'
                    value = new Date()
                }
                const original = app.settings.get(key)
                if (original !== value) {
                    updates.push(key, original, value)
                }
                await app.settings.set(key, value)
            }
            if (updates.length > 0) {
                await app.auditLog.Platform.platform.settings.updated(request.session.User, null, updates)
            }
            reply.send({ status: 'okay' })
        } else {
            reply.code(400).send('invalid request')
        }
    })
}
