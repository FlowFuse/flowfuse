const crypto = require('crypto')

/**
 * Completes user registration
 *   - creates user team (if `user:team:auto-create` is enabled
 *   - accepts any invitations matching the email
 */
async function completeUserSignup (app, user) {
    // Process invites first to see if user is in any teams
    const pendingInvitations = await app.db.models.Invitation.forExternalEmail(user.email)
    for (let i = 0; i < pendingInvitations.length; i++) {
        const invite = pendingInvitations[i]
        // For now we'll auto-accept any invites for this user
        // See https://github.com/FlowFuse/flowfuse/issues/275#issuecomment-1040113991
        await app.db.controllers.Invitation.acceptInvitation(invite, user)
        // // If we go back to having the user be able to accept invites
        // // as a secondary step, the following code will convert the external
        // // invite into an internal one.
        // invite.external = false
        // invite.inviteeId = user.id
        // await invite.save()
    }

    let personalTeam
    if (app.settings.get('user:team:auto-create')) {
        const teamLimit = app.license.get('teams')
        const teamCount = await app.db.models.Team.count()
        if (teamCount >= teamLimit) {
            const resp = { code: 'team_limit_reached', error: 'Unable to auto create user team: license limit reached' }
            await app.auditLog.User.account.verify.verifyToken(user, resp)
            throw new Error('team_limit_reached')
            // reply.code(400).send(resp)
            // return
        }
        // only create a personal team if no other teams exist
        if ((await app.db.models.Team.countForUser(user)) === 0) {
            let teamTypeId = app.settings.get('user:team:auto-create:teamType')

            if (!teamTypeId) {
                // No team type set - pick the 'first' one based on 'order'
                const teamTypes = await app.db.models.TeamType.findAll({ where: { active: true }, order: [['order', 'ASC']], limit: 1 })
                teamTypeId = teamTypes[0].id
            } else {
                teamTypeId = app.db.models.TeamType.decodeHashid(teamTypeId)
            }
            const teamProperties = {
                name: `Team ${user.name}`,
                slug: user.username,
                TeamTypeId: teamTypeId
            }
            personalTeam = await app.db.controllers.Team.createTeamForUser(teamProperties, user)
            await app.auditLog.Platform.platform.team.created(user, null, personalTeam)
            await app.auditLog.User.account.verify.autoCreateTeam(user, null, personalTeam)

            if (app.license.active() && app.billing) {
                // This checks to see if the team should be in trial mode
                await app.billing.setupTrialTeamSubscription(personalTeam, user)
            }
        }
    }

    // only create a starting instance if the flag is set and this user and their teams have no instances
    if (app.settings.get('user:team:auto-create:instanceType') &&
            personalTeam &&
            !((await app.db.models.Project.byUser(user)).length)) {
        const instanceTypeId = app.settings.get('user:team:auto-create:instanceType')

        const instanceType = await app.db.models.ProjectType.byId(instanceTypeId)
        const instanceStack = await instanceType?.getDefaultStack() || (await instanceType.getProjectStacks())?.[0]
        const instanceTemplate = await app.db.models.ProjectTemplate.findOne({ where: { active: true } })

        const userTeamMemberships = await app.db.models.Team.forUser(user)
        if (userTeamMemberships.length <= 0) {
            console.warn("Flag to auto-create instance is set ('user:team:auto-create:instanceType'), but user has no team, consider setting 'user:team:auto-create'")
            return // reply.send({ status: 'okay' })
        } else if (!instanceType) {
            throw new Error(`Instance type with id ${instanceTypeId} from 'user:team:auto-create:instanceType' not found`)
        } else if (!instanceStack) {
            throw new Error(`Unable to find a stack for use with instance type ${instanceTypeId} to auto-create user instance`)
        } else if (!instanceTemplate) {
            throw new Error('Unable to find the default instance template from which to auto-create user instance')
        }

        const applications = await app.db.models.Application.byTeam(personalTeam.id)
        let application
        if (applications.length > 0) {
            application = applications[0]
        } else {
            const applicationName = `${user.name}'s Application`

            application = await app.db.models.Application.create({
                name: applicationName.charAt(0).toUpperCase() + applicationName.slice(1),
                TeamId: personalTeam.id
            })

            await app.auditLog.User.account.verify.autoCreateApplication(user, null, application)
        }

        const safeTeamName = personalTeam.name.toLowerCase().replace(/[\W_]/g, '-')
        const safeUserName = user.username.toLowerCase().replace(/[\W_]/g, '-')

        const instanceProperties = {
            name: `${safeTeamName}-${safeUserName}-${crypto.randomBytes(4).toString('hex')}`
        }
        const instance = await app.db.controllers.Project.create(personalTeam, application, user, instanceType, instanceStack, instanceTemplate, instanceProperties)

        await app.auditLog.User.account.verify.autoCreateInstance(user, null, instance)
    }
}
/**
 * Completes the SSO sign-in process for a user
 *
 * Returns an object with the following properties:
 * - `cookie' : { value, options }: The session cookie to set in the response.
 * @param {*} app forge app
 * @param {*} user The email address of the user to complete SSO sign-in for.
 * @returns {Promise<void>}
 */
async function completeSSOSignIn (app, user) {
    // We know who this is
    const userInfo = app.auditLog.formatters.userObject(user)
    // They have completed authentication and we know who they are.
    const sessionInfo = await app.createSessionCookie(user.email)
    const result = { cookie: null }
    if (sessionInfo) {
        user.sso_enabled = true
        user.email_verified = true
        if (user.mfa_enabled) {
            // They are mfa_enabled - but have authenticated via SSO
            // so we will let them in without further challenge
            sessionInfo.session.mfa_verified = true
            await sessionInfo.session.save()
        }
        await user.save()
        userInfo.id = sessionInfo.session.UserId
        result.cookie = {
            value: sessionInfo.session.sid,
            options: sessionInfo.cookieOptions
        }
        // reply.setCookie('sid', sessionInfo.session.sid, sessionInfo.cookieOptions)
        await app.auditLog.User.account.login(userInfo, null)
    } else {
        const resp = { code: 'user_suspended', error: 'User Suspended' }
        await app.auditLog.User.account.login(userInfo, resp, userInfo)
    }
    return result
}

const generatePassword = () => {
    const charList = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz~!@-#$'
    return Array.from(crypto.randomFillSync(new Uint32Array(16))).map(x => charList[x % charList.length]).join('')
}

const generateUsernameFromEmail = async (app, email) => {
    const baseUsername = email.split('@')[0].replaceAll(/\+.*$/g, '').replaceAll(/[^0-9a-zA-Z-]/g, '')
    let username
    // Check if username is available
    let count = 0
    do {
        username = `${baseUsername}-${crypto.randomBytes(2).toString('hex')}`
        count = await app.db.models.User.count({
            where: {
                username
            }
        })
    } while (count > 0)
    return username.toLowerCase()
}
module.exports = {
    generateUsernameFromEmail,
    generatePassword,
    completeSSOSignIn,
    completeUserSignup
}
