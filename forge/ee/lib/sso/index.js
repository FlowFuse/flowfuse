const crypto = require('crypto')

const { Client } = require('ldapts')

const { Roles, TeamRoles } = require('../../../lib/roles')
const createTeamForUser = require('../../../lib/userTeam')

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
        const user = await app.db.models.User.byUsernameOrEmail(request.body.username)
        if (user) {
            const providerConfig = await app.db.models.SAMLProvider.forEmail(user.email)
            if (providerConfig) {
                if (providerConfig.type === 'saml') {
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
                } else if (providerConfig.type === 'ldap') {
                    if (!request.body.password) {
                        reply.code(401).send({ code: 'password_required', error: 'Password required' })
                        return true
                    }
                    const userInfo = app.auditLog.formatters.userObject(request.body)
                    const ldapVerified = await verifyLDAPUser(providerConfig, user, request.body.password)
                    if (ldapVerified) {
                        const sessionInfo = await app.createSessionCookie(request.body.username)
                        if (sessionInfo) {
                            userInfo.id = sessionInfo.session.UserId
                            user.sso_enabled = true
                            user.email_verified = true
                            if (user.mfa_enabled) {
                                // They are mfa_enabled - but have authenticated via SSO
                                // so we will let them in without further challenge
                                sessionInfo.session.mfa_verified = true
                                await sessionInfo.session.save()
                            }
                            await user.save()
                            reply.setCookie('sid', sessionInfo.session.sid, sessionInfo.cookieOptions)
                            if (sessionInfo.session.User.mfa_enabled && !sessionInfo.mfa_verified) {
                                reply.code(403).send({ code: 'mfa_required', error: 'MFA required' })
                                return true
                            }
                            await app.auditLog.User.account.login(userInfo, null)
                            reply.send()
                            return true
                        } else {
                            const resp = { code: 'user_suspended', error: 'User Suspended' }
                            await app.auditLog.User.account.login(userInfo, resp, userInfo)
                            reply.code(403).send(resp)
                            return true
                        }
                    } else if (user.admin) {
                        // If they are an admin, fallback to checking their local password
                        // so they won't be locked out due to an LDAP error
                        return false
                    } else {
                        const resp = { code: 'unauthorized', error: 'unauthorized' }
                        await app.auditLog.User.account.login(userInfo, resp, userInfo)
                        reply.code(401).send(resp)
                        return true
                    }
                }
            }
        } else {
            // should check if username is email address?
            const providerConfig = await app.db.models.SAMLProvider.forEmail(request.body.username)
            if (providerConfig?.options?.provisionNewUsers) {
                if (providerConfig.type === 'saml') {
                    reply.code(401).send({ code: 'sso_required', redirect: `/ee/sso/login?u=${request.body.username}` })
                    return true
                } else if (providerConfig.type === 'ldap') {
                    if (!request.body.password) {
                        reply.code(401).send({ code: 'password_required', error: 'Password required' })
                        return true
                    }
                    const tempUser = {
                        username: request.body.username,
                        email: request.body.username
                    }
                    const userInfo = app.auditLog.formatters.userObject(request.body)
                    if (verifyLDAPUser(providerConfig, tempUser, request.body.password)) {
                        // TODO create user
                        const newUserProperties = await lookupLDAPUser(providerConfig, request.body.username)
                        if (newUserProperties) {
                            const newUser = await app.db.models.User.create(newUserProperties)
                            const sessionInfo = await app.createSessionCookie(newUser.username)
                            if (sessionInfo) {
                                userInfo.id = sessionInfo.session.UserId
                                newUser.sso_enabled = true
                                newUser.email_verified = true
                                await newUser.save()
                                // create team for new user
                                await createTeamForUser(app, newUser)
                                reply.setCookie('sid', sessionInfo.session.sid, sessionInfo.cookieOptions)
                                await app.auditLog.User.account.login(userInfo, null)
                                reply.send()
                                return true
                            }
                        }
                    }
                    return false
                }
            }
        }
        return false
    }

    const generatePassword = () => {
        const charList = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz~!@-#$'
        return Array.from(crypto.randomFillSync(new Uint32Array(8))).map(x => charList[x % charList.length]).join('')
    }

    /**
     * Look up ldap user
     * @param {*} providerConfig the ldap confi
     * @param {String} username the User to lookup
     * @returns User properties
     */
    async function lookupLDAPUser (providerConfig, username) {
        let url = providerConfig.options.server
        if (!/^ldaps?:\/\//.test(url)) {
            if (providerConfig.options.tls) {
                url = 'ldaps://' + url
            } else {
                url = 'ldap://' + url
            }
        }
        const clientOptions = { url }
        if (providerConfig.options.tls) {
            if (!providerConfig.options.tlsVerifyServer) {
                clientOptions.tlsOptions = {
                    rejectUnauthorized: false
                }
            }
        }
        const adminClient = new Client(clientOptions)
        try {
            await adminClient.bind(providerConfig.options.username, providerConfig.options.password)
        } catch (err) {
            app.log.error(`Failed to bind LDAP client: Provider '${providerConfig.name}' ${url} ${err}`)
            return null
        }

        // Any errors from here must unbind the adminClient - so wrap all in try/catch
        try {
            const filter = providerConfig.options.userFilter.replace(/\${username}/g, username).replace(/\${email}/g, username)
            const { searchEntries } = await adminClient.search(providerConfig.options.baseDN, {
                filter
            })
            if (searchEntries.length === 1) {
                const userProperties = {
                    username: username.replace('@', '-').replaceAll('.', '_').toLowerCase(),
                    email: username,
                    password: generatePassword()
                }
                // may want to extend this list at some point
                if (searchEntries[0].displayName) {
                    userProperties.name = searchEntries[0].displayName
                } else if (searchEntries[0].givenName) {
                    if (searchEntries[0].sn) {
                        userProperties.name = `${searchEntries[0].givenName} ${searchEntries[0].sn}`
                    } else {
                        userProperties.name = `${searchEntries[0].givenName}`
                    }
                } else {
                    userProperties.name = username.split('@')[0]
                }
                return userProperties
            }
        } catch (err) {
            app.log.error(`Error looking up new LDAP User '${username}' Provider '${providerConfig.name}' ${url} ${err}`)
        } finally {
            try {
                if (adminClient) {
                    await adminClient.unbind()
                }
            } catch (err) {}
        }
        return null
    }

    /**
     * Verifies a user's ldap credentials
     * @param {*} providerConfig the ldap config
     * @param {User} user the User object to verify
     * @param {String} password the password
     * @returns True if it verifies, false if not
     */
    async function verifyLDAPUser (providerConfig, user, password) {
        let userClient
        let url = providerConfig.options.server
        if (!/^ldaps?:\/\//.test(url)) {
            if (providerConfig.options.tls) {
                url = 'ldaps://' + url
            } else {
                url = 'ldap://' + url
            }
        }
        const clientOptions = { url }
        if (providerConfig.options.tls) {
            if (!providerConfig.options.tlsVerifyServer) {
                clientOptions.tlsOptions = {
                    rejectUnauthorized: false
                }
            }
        }
        const adminClient = new Client(clientOptions)
        try {
            await adminClient.bind(providerConfig.options.username, providerConfig.options.password)
        } catch (err) {
            app.log.error(`Failed to bind LDAP client: Provider '${providerConfig.name}' ${url} ${err}`)
            return null
        }
        try {
            // Any errors from here must unbind the adminClient - so wrap all in try/catch

            const filter = providerConfig.options.userFilter.replace(/\${username}/g, user.username).replace(/\${email}/g, user.email)
            const { searchEntries } = await adminClient.search(providerConfig.options.baseDN, {
                filter
            })
            if (searchEntries.length === 1) {
                const userDN = searchEntries[0].dn
                userClient = new Client(clientOptions)
                try {
                    await userClient.bind(userDN, password)
                    return true
                } catch (err) {
                    // Failed to bind user
                    return false
                }
            }
        } catch (err) {
            app.log.error(`Error validating LDAP User '${user.username}' Provider '${providerConfig.name}' ${url} ${err}`)
        } finally {
            try {
                if (adminClient) {
                    await adminClient.unbind()
                }
            } catch (err) {}
            try {
                if (userClient) {
                    await userClient.unbind()
                }
            } catch (err) {}
        }
        return false
    }
    /**
     * Update a user's team memberships according to the SAML Assertions
     * received when they logged in.
     *
     * @param {*} samlUser The user profile object provided by the authentication provider
     * @param {*} user The FF User object who is logging in
     * @param {*} providerOpts The SAML Provider configuration object
     */
    async function updateTeamMembership (samlUser, user, providerOpts) {
        // Look for the expected assertion in the SAML profile we have received
        // This is an array of groups the user belongs to. We expect them to be
        // of the form 'ff-SLUG-ROLE' - anything else is ignored
        let groupAssertions = samlUser[providerOpts.groupAssertionName]
        if (groupAssertions) {
            const promises = []
            if (!Array.isArray(groupAssertions)) {
                groupAssertions = [groupAssertions]
            }
            const desiredTeamMemberships = {}
            groupAssertions.forEach(ga => {
                // Parse the group name - format: 'ff-SLUG-ROLE'
                // Generate a slug->role object (desiredTeamMemberships)
                const match = /^ff-(.+)-([^-]+)$/.exec(ga)
                if (match) {
                    const teamSlug = match[1]
                    const teamRoleName = match[2]
                    const teamRole = Roles[teamRoleName]
                    // Check this role is a valid team role
                    if (TeamRoles.includes(teamRole)) {
                        // Check if this team is allowed to be managed for this SSO provider
                        //  - either `groupAllTeams` is true (allowing all teams to be managed this way)
                        //  - or `groupTeams` (array) contains the teamSlug
                        if (providerOpts.groupAllTeams || (providerOpts.groupTeams || []).includes(teamSlug)) {
                            // In case we have multiple assertions for a single team,
                            // ensure we keep the highest level of access
                            desiredTeamMemberships[teamSlug] = Math.max(desiredTeamMemberships[teamSlug] || 0, teamRole)
                        }
                    }
                }
            })

            // Get the existing memberships and generate a slug->membership object (existingMemberships)
            const existingMemberships = {}
            ;((await user.getTeamMemberships(true)) || []).forEach(membership => {
                // Filter out any teams that are not to be managed by this configuration.
                // A team is managed by this configuration if any of the follow is true:
                //  - groupAllTeams is true (all teams to be managed)
                //  - groupTeams includes this team (this is explicitly a team to be managed)
                //  - groupOtherTeams is false (not allowed to be a member of other teams - so need to remove them)
                if (
                    providerOpts.groupAllTeams ||
                    (providerOpts.groupTeams || []).includes(membership.Team.slug) ||
                    !providerOpts.groupOtherTeams
                ) {
                    existingMemberships[membership.Team.slug] = membership
                }
            })

            // We now have the list of desiredTeamMemberships and existingMemberships
            // that are in scope of being modified

            // - Check each existing membership
            //   - if in desired list, update role to match and delete from desired list
            //   - if not in desired list,
            //      - if groupOtherTeams is false or, delete membership
            //      - else leave alone
            for (const [teamSlug, membership] of Object.entries(existingMemberships)) {
                if (Object.hasOwn(desiredTeamMemberships, teamSlug)) {
                    // This team is in the desired list
                    if (desiredTeamMemberships[teamSlug] !== membership.role) {
                        // Role has changed - update membership
                        // console.log(`changing role in team ${teamSlug} from ${membership.role} to ${desiredTeamMemberships[teamSlug]}`)

                        const updates = new app.auditLog.formatters.UpdatesCollection()
                        const oldRole = app.auditLog.formatters.roleObject(membership.role)
                        const role = app.auditLog.formatters.roleObject(desiredTeamMemberships[teamSlug])
                        updates.push('role', oldRole.role, role.role)
                        membership.role = desiredTeamMemberships[teamSlug]
                        promises.push(membership.save().then(() => {
                            return app.auditLog.Team.team.user.roleChanged(user, null, membership.Team, user, updates)
                        }))
                    } else {
                        // Role has not changed - no update needed
                        // console.log(`no change needed for team ${teamSlug} role ${membership.role}`)
                    }
                    // Remove from the desired list as it has been dealt with
                    delete desiredTeamMemberships[teamSlug]
                } else {
                    // console.log(`removing from team ${teamSlug}`)
                    // This team is not in the desired list - delete the membership
                    promises.push(membership.destroy().then(() => {
                        return app.auditLog.Team.team.user.removed(user, null, membership.Team, user)
                    }))
                }
            }
            // - Check remaining desired memberships
            //   - create membership
            for (const [teamSlug, teamRole] of Object.entries(desiredTeamMemberships)) {
                // This is a new team membership
                promises.push(app.db.models.Team.bySlug(teamSlug).then(team => {
                    if (team) {
                        // console.log(`adding to team ${teamSlug} role ${teamRole}`)
                        return app.db.controllers.Team.addUser(team, user, teamRole).then(() => {
                            return app.auditLog.Team.team.user.added(user, null, team, user)
                        })
                    } else {
                        // console.log(`team not found ${teamSlug}`)
                        // Unrecognised team - ignore
                        return null
                    }
                }))
            }

            await Promise.all(promises)
        } else {
            const missingGroupAssertions = new Error(`SAML response missing ${providerOpts.groupAssertionName} assertion`)
            missingGroupAssertions.code = 'unknown_sso_user'
            throw missingGroupAssertions
        }
    }

    return {
        handleLoginRequest,
        isSSOEnabledForEmail,
        getProviderOptions,
        getProviderForEmail,
        updateTeamMembership
    }
}
