const { Roles, TeamRoles } = require('../../../lib/roles')

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
            }
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
