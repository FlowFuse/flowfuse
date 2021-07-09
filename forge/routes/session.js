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
const cookie = require('fastify-cookie');


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

module.exports = fp(function(app, opts, done) {

    app.register(cookie, {
        secret: app.secrets.sessionSecret, // for cookies signature
    })

    // WIP:
    app.decorate("verifyToken", function(request, reply, done) {
        if (request.headers && request.headers.authorization) {
            const parts = request.headers.authorization.split(" ");
            if (parts.length === 2) {
                const scheme = parts[0]
                const token = parts[1]
                console.log(`[${scheme}][${token}]`)
                if (scheme !== "Bearer") {
                    return done(new Error("Unsupported authorization scheme"))
                }
                if (token !== "ABCD") {
                    // reply.code(401).send({ error: 'Unauthorized tokebn' })
                    return done(new Error("bad token"))
                } else {
                    done();
                }
            } else {
                return done(new Error("Malformed authorization header"))
            }
        } else {
            done(new Error("Missing authorization header"))
        }
    });

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
    app.decorate("verifySession", async (request, reply) => {
        if (request.sid) {
            request.session = await app.db.controllers.Session.getOrExpire(request.sid);
            if (request.session) {
                return;
            }
        }
        reply.code(401).send({ error: 'unauthorized' })
        return new Error()
    });

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
    },async (request, reply) => {
        const result = await app.db.controllers.User.authenticateCredentials(request.body.username,request.body.password);
        if (result) {
            const session = await app.db.controllers.Session.createSession(request.body.username);
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

    done()
})
