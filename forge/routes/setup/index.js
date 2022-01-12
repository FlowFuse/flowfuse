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
const { v4: uuidv4 } = require('uuid');

const setupApp = path.join(__dirname, "../../../frontend/dist-setup/setup.html")

module.exports = async function(app) {
    let cachedSetupFile;


    app.get('/setup', async (_,reply) => {
        if (app.settings.get("setup:initialised")) {
            reply.redirect("/")
        }
        const csrfToken = await reply.generateCsrf();
        if (!cachedSetupFile) {
            cachedSetupFile = await fs.readFile(setupApp,"utf-8")
        }
        const result = cachedSetupFile.replace("{{SETUP_CSRF_TOKEN}}",csrfToken)
        reply.type('text/html').send(result)
    })

    app.get('/setup/status', async (_,reply) => {
        if (app.settings.get("setup:initialised")) {
            reply.redirect("/")
        }
        const status = {
            adminUser: (await app.db.models.User.count()) !== 0,
            license: app.license.active(),
            email: !!app.postoffice.exportSettings(true)
        }
        reply.type('application/json').send(status);

    })

    app.post('/setup/finish', {
        preValidation: app.csrfProtection,
    }, async (request, reply) => {
        if (app.settings.get("setup:initialised")) {
            reply.code(404);
            return
        }
        await app.settings.set("setup:initialised",true);
        await app.settings.set("instanceId", uuidv4());
        reply.send({status: "okay"})
    });

    /**
     * Creates the initial admin user
     */
    app.post('/setup/create-user', {
        preValidation: app.csrfProtection,
        schema: {
            body: {
                type: 'object',
                required: ['name','username','password'],
                properties: {
                    name: { type: 'string' },
                    username: { type: 'string' },
                    password: { type: 'string' }
                }
            }
        }
    }, async (request, reply) => {
        if (app.settings.get("setup:initialised")) {
            reply.code(404);
            return
        }
        if (/^(admin|root)$/.test(request.body.username)) {
            reply.code(400).send({error:"invalid username"});
            return
        }
        try {
            const newUser = await app.db.models.User.create({
                username: request.body.username,
                name: request.body.name,
                email: request.body.email,
                email_verified: true,
                password: request.body.password,
                admin: true
            });
            reply.send({status: "okay"})
        } catch(err) {
            let responseMessage;
            if (err.errors) {
                responseMessage = err.errors.map(err => err.message).join(",");
            } else {
                responseMessage = err.toString();
            }
            reply.code(400).send({error:responseMessage})
        }
    });
    app.post('/setup/add-license', {
        preValidation: app.csrfProtection,
        schema: {
            body: {
                type: 'object',
                required: ['license'],
                properties: {
                    license: { type: 'string' },
                }
            }
        }
    }, async (request, reply) => {
        if (app.settings.get("setup:initialised")) {
            reply.code(404);
            return
        }
        try {
            await app.license.apply(request.body.license);
            reply.send({status: "okay"})
        } catch(err) {
            console.log(err);
            let responseMessage = err.toString();
            if (/malformed/.test(responseMessage)) {
                responseMessage = "Failed to parse license";
            }
            reply.code(400).send({error:responseMessage})
        }
    });

}
