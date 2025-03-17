module.exports = async function (app, opts) {
    /**
     * Begin MFA setup
     * 1. Generate MFA Token
     * 2. Return qrcode
     */
    app.put('/user/mfa', {
        preHandler: app.needsPermission('user:edit')
    }, async (request, reply) => {
        if (request.session.User.mfa_enabled) {
            return reply.status(400).send({ code: 'mfa_enabled', error: 'MFA is already enabled for this user' })
        }
        const token = await app.db.models.MFAToken.createTokenForUser(request.session.User)
        reply.send(await token.generateAuthURL())
    })

    /**
     * Complete MFA setup
     */
    app.put('/user/mfa/verify', {
        preHandler: app.needsPermission('user:edit')
    }, async (request, reply) => {
        if (request.session.User.mfa_enabled) {
            return reply.status(400).send({ code: 'mfa_enabled', error: 'MFA is already enabled for this user' })
        }
        const mfaToken = await app.db.models.MFAToken.forUser(request.session.User)
        if (!mfaToken) {
            return reply.status(400).send({ code: 'mfa_disabled', error: 'MFA is not setup for this user' })
        }
        if (mfaToken.verified) {
            // This token has already been verified, but the user doesn't have the mfa_enabled flag
            // set. This is *not* an expected condition - the workflows should not
            // allow this combination to happen.
            return reply.status(400).send({ code: 'mfa_enabled', error: 'MFA is already enabled for this user' })
        }
        if (!mfaToken.verifyToken(request.body.token)) {
            // Failed verification
            await mfaToken.destroy()
            return reply.status(400).send({ code: 'mfa_failed', error: 'Failed to verify MFA token' })
        }

        // Token has been verified
        mfaToken.verified = true
        request.session.User.mfa_enabled = true
        request.session.mfa_verified = true
        await Promise.all([
            mfaToken.save(),
            request.session.User.save(),
            request.session.save(),
            app.db.controllers.AccessToken.deleteAllUserPasswordResetTokens(request.session.User)
        ])
        reply.send({ status: 'okay' })
    })

    /**
     * Disable MFA for the user
     */
    app.delete('/user/mfa', {
        preHandler: app.needsPermission('user:edit')
    }, async (request, reply) => {
        await app.db.models.MFAToken.deleteTokenForUser(request.session.User)
        reply.send({ status: 'okay' })
    })
}
