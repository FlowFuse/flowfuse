/**
 * Routes that serve the setup app and its api
 *
 * - `/setup`
 *
 * @namespace setup
 * @memberof forge.routes
 */
const path = require('path')
const fs = require('fs').promises

const setupApp = path.join(__dirname, '../../../frontend/dist-setup/setup.html')

module.exports = async function (app) {
    let cachedSetupFile

    app.get('/setup', async (_, reply) => {
        if (app.settings.get('setup:initialised')) {
            reply.redirect('/')
            return
        }
        const csrfToken = await reply.generateCsrf()
        if (!cachedSetupFile) {
            cachedSetupFile = await fs.readFile(setupApp, 'utf-8')
        }
        const result = cachedSetupFile.replace('{{SETUP_CSRF_TOKEN}}', csrfToken)
        reply.type('text/html').send(result)
    })

    app.get('/setup/status', async (_, reply) => {
        if (app.settings.get('setup:initialised')) {
            reply.redirect('/')
        }
        const status = {
            adminUser: (await app.db.models.User.count()) !== 0,
            license: app.license.active(),
            email: !!app.postoffice.exportSettings(true)
        }
        reply.type('application/json').send(status)
    })

    app.post('/setup/finish', {
        preValidation: app.csrfProtection
    }, async (request, reply) => {
        if (app.settings.get('setup:initialised')) {
            reply.code(404).send()
            return
        }
        try {
            const adminUser = await app.db.models.User.findOne({
                where: {
                    admin: true
                }
            })
            const projectType = await app.db.controllers.ProjectType.createDefaultProjectType()
            app.log.info('[SETUP] Created default ProjectType')
            await app.db.controllers.ProjectTemplate.createDefaultTemplate(adminUser)
            app.log.info('[SETUP] Created default ProjectTemplate')
            await app.db.controllers.ProjectStack.createDefaultProjectStack(projectType)
            app.log.info('[SETUP] Created default ProjectStack')
            await app.settings.set('setup:initialised', true)
            app.log.info('****************************************************')
            app.log.info('* FlowForge setup is complete. You can login at:   *')
            app.log.info(`*   ${app.config.base_url.padEnd(47, ' ')}*`)
            app.log.info('****************************************************')
            reply.send({ status: 'okay' })
        } catch (err) {
            app.log.error(`Failed to create default ProjectStack: ${err.toString()}`)
            console.log(err.stack)
            reply.code(500).send({ code: 'error', message: err.toString() })
        }
    })

    /**
     * Creates the initial admin user
     */
    app.post('/setup/create-user', {
        preValidation: app.csrfProtection,
        schema: {
            body: {
                type: 'object',
                required: ['name', 'username', 'password'],
                properties: {
                    name: { type: 'string' },
                    username: { type: 'string' },
                    password: { type: 'string' }
                }
            }
        }
    }, async (request, reply) => {
        if (app.settings.get('setup:initialised')) {
            reply.code(404).send()
            return
        }
        if (/^(admin|root)$/.test(request.body.username)) {
            reply.code(400).send({ error: 'invalid username' })
            return
        }
        try {
            await app.db.models.User.create({
                username: request.body.username,
                name: request.body.name,
                email: request.body.email,
                email_verified: true,
                password: request.body.password,
                admin: true
            })
            app.log.info(`[SETUP] Created admin user ${request.body.username}`)
            reply.send({ status: 'okay' })
        } catch (err) {
            let responseMessage
            if (err.errors) {
                responseMessage = err.errors.map(err => err.message).join(',')
            } else {
                responseMessage = err.toString()
            }
            reply.code(400).send({ error: responseMessage })
        }
    })
    app.post('/setup/add-license', {
        preValidation: app.csrfProtection,
        schema: {
            body: {
                type: 'object',
                required: ['license'],
                properties: {
                    license: { type: 'string' }
                }
            }
        }
    }, async (request, reply) => {
        if (app.settings.get('setup:initialised')) {
            reply.code(404).send()
            return
        }
        try {
            await app.license.apply(request.body.license)
            app.log.info('[SETUP] Applied license')
            reply.send({ status: 'okay' })
        } catch (err) {
            let responseMessage = err.toString()
            if (/malformed/.test(responseMessage)) {
                responseMessage = 'Failed to parse license'
            }
            reply.code(400).send({ error: responseMessage })
        }
    })

    app.post('/setup/settings', {
        preValidation: app.csrfProtection,
        schema: {
            body: {
                type: 'object',
                required: ['telemetry'],
                properties: {
                    telemetry: { type: 'boolean' }
                }
            }
        }
    }, async (request, reply) => {
        if (app.settings.get('setup:initialised')) {
            reply.code(404).send()
            return
        }
        try {
            await app.settings.set('telemetry:enabled', request.body.telemetry)
            app.log.info('[SETUP] Applied settings')
            reply.send({ status: 'okay' })
        } catch (err) {
            console.log(err)
            const responseMessage = err.toString()
            reply.code(400).send({ error: responseMessage })
        }
    })
}
