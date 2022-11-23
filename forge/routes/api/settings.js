module.exports = async function (app) {
    app.get('/', { config: { allowAnonymous: true, allowUnverifiedEmail: true } }, async (request, reply) => {
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

        if (request.session && request.session.User) {
            const response = {
                'team:user:invite:external': app.settings.get('team:user:invite:external') && app.postoffice.enabled(),
                'team:create': app.settings.get('team:create'),
                'user:tcs-required': app.settings.get('user:tcs-required'),
                'user:tcs-url': app.settings.get('user:tcs-url'),
                'user:tcs-date': app.settings.get('user:tcs-date'),
                email: app.postoffice.enabled(),
                stacks: app.containers.properties().stack || {},
                features: app.config.features.getAllFeatures(),
                base_url: app.config.base_url
            }

            if (request.session.User.admin) {
                response['telemetry:enabled'] = app.settings.get('telemetry:enabled')
                response['user:signup'] = app.settings.get('user:signup')
                response['user:reset-password'] = app.settings.get('user:reset-password')
                response['user:team:auto-create'] = app.settings.get('user:team:auto-create')
                response.email = app.postoffice.exportSettings(true)
                response['version:forge'] = app.settings.get('version:forge')
                response['version:node'] = app.settings.get('version:node')
            }
            reply.send(response)
        } else {
            reply.send({
                features: app.config.features.getPublicFeatures(),
                'user:signup': app.settings.get('user:signup') && app.postoffice.enabled(),
                'user:reset-password': app.settings.get('user:reset-password') && app.postoffice.enabled(),
                'user:tcs-required': app.settings.get('user:tcs-required') && app.postoffice.enabled(),
                'user:tcs-url': app.settings.get('user:tcs-url')
            })
        }
    })

    app.put('/', { preHandler: app.verifyAdmin }, async (request, reply) => {
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
