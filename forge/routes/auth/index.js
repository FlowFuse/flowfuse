/**
 * Routes related to session handling, login/out etc
 *
 * Handles adding `request.sid` and `request.session` to each request if there
 * is a valid session.
 *
 * - `/account/login`
 * - `/account/logout`
 *
 * Provides preHandler functions to secure routes
 *
 *  - `forge.verifySession`
 *  - `forge.verifyAdmin`
 *
 * @namespace session
 * @memberof forge.routes
 */
const fp = require("fastify-plugin");

const { Roles } = require("../../lib/roles")

// Default to a 12 hour session if the user ticks 'remember me'
// TODO - turn this into an idle timeout, with a separate 'max session' timeout.
const SESSION_MAX_AGE = 60*60*12; // 12 hours in seconds

// Options to apply to our session cookie
const SESSION_COOKIE_OPTIONS = {
    httpOnly: true,
    path: '/',
    signed: true
    // TODO: secure only when in production
}

module.exports = fp(async function(app, opts, done) {
    await app.register(require("./oauth"))
    await app.register(require("./permissions"))

    // WIP:
    async function verifyToken(request, reply) {
        if (request.headers && request.headers.authorization) {
            const parts = request.headers.authorization.split(" ");
            if (parts.length === 2) {
                const scheme = parts[0]
                const token = parts[1]
                if (scheme !== "Bearer") {
                    throw new Error("Unsupported authorization scheme")
                }
                if (/^fft/.test(token)) {
                    const accessToken = await app.db.controllers.AccessToken.getOrExpire(token);
                    if (accessToken) {
                        request.session = {
                            ownerId: accessToken.ownerId,
                            ownerType: accessToken.ownerType,
                            scope: accessToken.scope
                        }
                        return;
                    }
                } else if (/^ffp/.test(token)) {
                    request.session = await app.db.controllers.Session.getOrExpire(token);
                    return;
                }
                throw new Error(`bad token ${token}`)
            } else {
                // return done(new Error("Malformed authorization header"))
                throw new Error("Malformed authorization header")
            }
        } else {
            // done(new Error("Missing authorization header"))
            throw new Error("Missing authorization header")
        }
    }

    app.decorate("verifyToken", verifyToken);

    app.decorate("verifyTokenOrSession", async function(request, reply){
        //Order is important, other way round breaks nr-auth plugin
        if (request.sid){
            await verifySession(request, reply)
        } else if (request.headers && request.headers.authorization) {
            await verifyToken(request, reply)
        } else if (request.context.config.allowAnonymous) {
            return;
        } else {
            reply.code(401).send({ error: 'unauthorized' })
            throw new Error()
        }
    })

    /**
     * preHandler function that ensures the current request comes from an active
     * session.
     *
     * Currently this is based only on session cookie. This needs expanding
     * to include authorisation tokens.
     *
     * It sets `request.session` to the active session object.
     * @name verifySession
     * @static
     * @memberof forge
     */
    async function verifySession(request, reply) {
        if (request.sid) {
            request.session = await app.db.controllers.Session.getOrExpire(request.sid);
            if (request.session) {
                return;
            }
        }
        if (request.context.config.allowAnonymous) {
            return;
        }
        reply.code(401).send({ error: 'unauthorized' })
        throw new Error()
    }
    app.decorate("verifySession", verifySession);

    /**
     * preHandler function that ensures the current request comes from
     * an admin user.
     *
     * @name verifyAdmin
     * @static
     * @memberof forge
     */
    app.decorate("verifyAdmin", async (request, reply) => {
        if (request.session && request.session.User.admin) {
            return;
        }
        reply.code(401).send({ error: 'unauthorized' })
        return new Error()
    });

    app.decorateRequest('session', null)
    app.decorateRequest('sid', null)

    // Extract the session cookie and attach as request.sid
    app.addHook('onRequest', async (request, reply) => {
        if (request.cookies.sid) {
            const sid = reply.unsignCookie(request.cookies.sid);
            if (sid.valid) {
                request.sid = sid.value;
            } else {
                reply.clearCookie('sid');
            }
        }

    })

    // app.post('/account/register', (request, reply) => {
    //
    // })

    /**
     * Login a user.
     *
     * Requires a body containing:
     *
     * ```json
     * {
     *    "username": "username",
     *    "password": "password"
     * }
     * ```
     * @name /account/login
     * @static
     * @memberof forge.routes.session
     */
    app.post('/account/login', {
        schema: {
            body: {
                type: 'object',
                required: ['username', 'password'],
                properties: {
                    username: { type: 'string' },
                    password: { type: 'string' },
                    remember: { type: 'boolean', default: false }
                }
            }
        }
    }, async (request, reply) => {
        const result = await app.db.controllers.User.authenticateCredentials(request.body.username,request.body.password);
        if (result) {
            const session = await app.db.controllers.Session.createUserSession(request.body.username);
            if (session) {
                const cookieOptions = {...SESSION_COOKIE_OPTIONS};
                if (request.body.remember) {
                    cookieOptions.maxAge = SESSION_MAX_AGE;
                }
                reply.setCookie('sid',session.sid,cookieOptions);
                reply.send({status:"okay"})
                return
            }
        }
        reply.code(401).send({ error: 'unauthorized' })
    })

    /**
     * @name /account/logout
     * @static
     * @memberof forge.routes.session
     */
    app.post('/account/logout', async (request, reply) => {
        if (request.sid) {
            await app.db.controllers.Session.deleteSession(request.sid);
        }
        reply.clearCookie('sid');
        reply.send({status:"okay"})
    })

    /**
     * @name /account/register
     * @static
     * @memberof forge.routes.session
     */
    app.post('/account/register', {
        schema: {
            body: {
                type: 'object',
                required: ['username', 'password'],
                properties: {
                    username: { type: 'string' },
                    password: { type: 'string' },
                    name: { type: 'string' }
                }
            }
        }
    }, async (request, reply) => {
        if (!app.settings.get("user:signup")) {
            reply.code(400).send({error:"user registration not enabled"});
            return
        }
        if (!app.postoffice.enabled()) {
            reply.code(400).send({error:"user registration not enabled - email not configured"});
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
                email_verified: false,
                password: request.body.password,
                admin: false
            });
            const verifyToken = await app.db.controllers.User.generateEmailVerificationToken(newUser);
            await app.postoffice.send(
                newUser,
                "VerifyEmail",
                {
                    confirmEmailLink: `${process.env.BASE_URL}/account/verify/${verifyToken}`
                }
            )
            reply.send({status:"okay"})
        } catch(err) {
            let responseMessage;
            if (err.errors) {
                responseMessage = err.errors.map(err => err.message).join(",");
            } else {
                responseMessage = err.toString();
            }
            reply.code(400).send({error:responseMessage})
            return;
        }
    })

    app.get('/account/verify/:token', async (request,reply) => {
        try {
            let sessionUser;
            if (request.sid) {
                request.session = await app.db.controllers.Session.getOrExpire(request.sid);
                sessionUser = request.session.User;
            }
            const verifiedUser = await app.db.controllers.User.verifyEmailToken(sessionUser, request.params.token);

            if (app.settings.get("user:team:auto-create")) {
                // Create a team
                const newTeam = await app.db.models.Team.create({
                    name: `Team ${verifiedUser.name}`,
                    slug: verifiedUser.username
                });
                await newTeam.addUser(verifiedUser, { through: { role:Roles.Owner } });
            }


            const pendingInvitations = await app.db.models.Invitation.forExternalEmail(verifiedUser.email)
            for (let i=0;i<pendingInvitations.length;i++) {
                const invite = pendingInvitations[i];
                invite.external = false;
                invite.inviteeId = verifiedUser.id;
                await invite.save()
            }



            reply.redirect("/");
        } catch(err) {
            console.log(err.toString())
            reply.code(400).send({status:"error", message:err.toString()})
        }
    });

    app.post('/account/verify',{ preHandler: app.verifySession }, async(request,reply) => {
        if (!app.postoffice.enabled()) {
            reply.code(400).send({error:"email not configured"});
            return
        }
        if (!request.session.User.email_verified) {
            const verifyToken = await app.db.controllers.User.generateEmailVerificationToken(request.session.User);
            await app.postoffice.send(
                request.session.User,
                "VerifyEmail",
                {
                    confirmEmailLink: `${process.env.BASE_URL}/account/verify/${verifyToken}`
                }
            )
            reply.send({status:"okay"})
        } else {
            reply.code(400).send({status:"error", message:"Email already verified" })
        }
    })

    done()
})
