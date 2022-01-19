const {URL} = require("url");
const querystring = require("querystring");

const LRU = require("lru-cache"); // https://www.npmjs.com/package/lru-cache
const crypto = require("crypto");

const requestCache = new LRU({
    maxAge: 1000*60*10 // 10 minutes
})

function badRequest(reply, error, description) {
    reply.code(400).send({
        error,
        description
    })
}

function redirectInvalidRequest(reply, redirect_uri, error, error_description, state) {
    const responseUrl = new URL(redirect_uri);
    const response = { error, error_description };
    if (state) {
        response.state = state;
    }
    responseUrl.search = querystring.stringify(response)
    reply.redirect(responseUrl.toString())
}

function base64URLEncode(str) {
    return str.toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}
function sha256(buffer) {
    return crypto.createHash('sha256').update(buffer).digest();
}
// var verifier = base64URLEncode(crypto.randomBytes(32));
// var challenge = base64URLEncode(sha256(verifier));



module.exports = async function(app) {

    app.addContentTypeParser('application/x-www-form-urlencoded', { parseAs: 'string' }, function (req, body, done) {
        try {
            var json = querystring.parse(body)
            done(null, json)
        } catch (err) {
            err.statusCode = 400
            done(err, undefined)
        }
    })

    app.get("/account/authorize", {
        schema: {
            querystring: {
                type: 'object',
                // client_id and redirect_uri are handled manually
                required:['response_type','scope','code_challenge','code_challenge_method']
            }
        },
        attachValidation: true
    }, async function(request, reply) {
        const {
            response_type,
            client_id,
            scope,
            redirect_uri,
            state,
            code_challenge,
            code_challenge_method
        } = request.query;

        // If client_id/redirect_uri missing/invalid - reject directly with bad request
        if (!client_id) {
            return badRequest(reply, "invalid_request", "Invalid client_id")
        }
        // Check client_id is valid. Note - no client_secret provided at this point
        const authClient = await app.db.controllers.AuthClient.getAuthClient(client_id);
        if (!authClient) {
            return badRequest(reply, "invalid_request", "Invalid client_id")
        }

        if (!redirect_uri) {
            return badRequest(reply, "invalid_request", "Invalid redirect_uri")
        }
        // If anything else missing, redirect with details
        if (request.validationError) {
            redirectInvalidRequest(reply, redirect_uri, "invalid_request", request.validationError.message, state)
            return;
        }

        // http://localhost:3000/account/authorize?client_id=foo&redirect_uri=http://localhost:3000/account/bounce&scope=openid%20profile&response_type=code&state=ABC&code_challenge=yV39yiCZm7LlI_VgcTJTRICWJGcc3a_l1KSdlyX2uME&code_challenge_method=S256


        if (response_type !== "code") {
            return redirectInvalidRequest(reply, redirect_uri, "unsupported_response_type", "Invalid response_type. Only 'code' is supported", state)
        }
        if (code_challenge_method !== "S256") {
            return redirectInvalidRequest(reply, redirect_uri, "invalid_request", "Invalid code_challenge_method. Only 'S256' is supported", state)
        }
        if (!/^editor$/.test(scope)) {
            return redirectInvalidRequest(reply, redirect_uri, "invalid_request", "Invalid scope '"+scope+"'. Only 'editor' is supported", state)
        }

        const requestObject = {
            response_type,
            client_id,
            scope,
            redirect_uri,
            state,
            code_challenge,
            code_challenge_method
        }
        const requestId = base64URLEncode(crypto.randomBytes(32));
        requestCache.set(requestId, requestObject)

        if (request.sid) {
            request.session = await app.db.controllers.Session.getOrExpire(request.sid);
            if (request.session) {
                // Logged in with valid session - bounce to complete page
                reply.redirect(`${app.config.base_url}/account/complete/${requestId}`)
                return
            }
        }
        // Redirect to login page with requestId in url - to bounce to an approve page
        reply.redirect(`${app.config.base_url}/account/request/${requestId}`)
    })

    app.get("/account/complete/:code", async function(request, reply) {
        const requestId = request.params.code;
        const requestObject = requestCache.get(requestId);
        requestCache.del(requestId);

        if (!requestObject) {
            return badRequest(reply, "invalid_request", "Invalid request")
        }

        if (request.sid) {
            request.session = await app.db.controllers.Session.getOrExpire(request.sid);
            if (request.session) {
                const authClient = await app.db.controllers.AuthClient.getAuthClient(requestObject.client_id);
                if (!authClient) {
                    return badRequest(reply, "invalid_request", "Invalid client_id")
                }
                const project = await app.db.models.Project.byId(authClient.ownerId);
                const teamMembership = await request.session.User.getTeamMembership(project.TeamId)
                if (!teamMembership) {
                    return redirectInvalidRequest(reply, requestObject.redirect_uri,  "access_denied", "Access Denied", requestObject.state)
                }
                requestObject.username = request.session.User.username;
                requestObject.code = base64URLEncode(crypto.randomBytes(32))
                requestCache.set(requestObject.code, requestObject);
                const responseUrl = new URL(requestObject.redirect_uri);

                responseUrl.search = querystring.stringify({
                    code: requestObject.code,
                    state: requestObject.state
                })
                reply.redirect(responseUrl.toString())
                return;
            }
        }
        return badRequest(reply, "access_denied", "Access Denied")
    })

    app.post("/account/token", {
        schema: {
            body: {
                type: 'object',
                // client_id, redirect_uri, code, code_verifier are handled manually
                required:['grant_type']
            }
        },
        attachValidation: true
    },
    async function(request,reply) {
        const {
            grant_type,
            code,
            code_verifier,
            client_id,
            client_secret,
            redirect_uri,
            refresh_token
        } = request.body;

        if (request.validationError) {
            badRequest(reply, "invalid_request", request.validationError.message)
            return;
        }

        if (!client_id) {
            return badRequest(reply, "invalid_request", "Invalid client_id")
        }

        const authClient = await app.db.controllers.AuthClient.getAuthClient(client_id,client_secret);
        if (!authClient) {
            return badRequest(reply, "invalid_request", "Invalid client_id")
        }

        if (grant_type === "authorization_code") {
            if (!code) {
                return badRequest(reply, "invalid_request", "Invalid code")
            }
            if (!redirect_uri) {
                return badRequest(reply, "invalid_request", "Invalid redirect_uri")
            }
            if (!code_verifier) {
                return badRequest(reply, "invalid_request", "Invalid code_verifier")
            }
            const requestObject = requestCache.get(code);
            requestCache.del(code);

            if (!requestObject) {
                badRequest(reply, "invalid_request", "Invalid code")
                return
            }
            if (!requestObject.username) {
                badRequest(reply, "access_denied", "Access Denied - missing user", requestObject.state)
                return
            }
            if (requestObject.client_id !== client_id) {
                badRequest(reply, "invalid_request", "Invalid client_id", requestObject.state)
                return
            }
            if (requestObject.redirect_uri !== redirect_uri) {
                badRequest(reply, "invalid_request", "Invalid redirect_uri", requestObject.state)
                return
            }
            if (requestObject.code_challenge !== base64URLEncode(sha256(code_verifier))) {
                redirectInvalidRequest(reply, "invalid_request", "Invalid code_verifier", requestObject.state)
                return
            }

            const sessionTokens = await app.db.controllers.Session.createTokenSession(requestObject.username);

            const response = {
                access_token: sessionTokens.sid,
                expires_in: Math.floor((sessionTokens.expiresAt - Date.now())/1000),
                refresh_token: sessionTokens.refreshToken,
                state: requestObject.state
            }
            reply.send(response);
        } else if (grant_type === 'refresh_token') {
            // We have validated client_id and client_secret by this point.

            const existingSession = await app.db.models.Session.byRefreshToken(refresh_token);

            // Check the owner of the existing session still has access to the project
            // this client is owned by
            const project = await app.db.models.Project.byId(authClient.ownerId);
            const teamMembership = await app.db.models.TeamMember.findOne({where: {TeamId:project.TeamId, UserId:existingSession.UserId }})
            if (!teamMembership) {
                return badRequest(reply, "access_denied", "Access Denied")
            }

            const sessionTokens = await app.db.controllers.Session.refreshTokenSession(refresh_token);
            if (!sessionTokens) {
                badRequest(reply,  "invalid_request", "Invalid refresh_token");
                return
            }
            const response = {
                access_token: sessionTokens.sid,
                expires_in: Math.floor((sessionTokens.expiresAt - Date.now())/1000),
                refresh_token: sessionTokens.refreshToken,
            }
            reply.send(response);
        } else {
            badRequest(reply, "invalid_request", "Invalid grant_type. Only 'authorization_code' and 'refresh_token' are supported")
            return
        }

    });
};
