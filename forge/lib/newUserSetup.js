const crypto = require('crypto')

module.exports = async function newUserSetup (app, verifiedUser) {
    if (app.settings.get('user:team:auto-create')) {
        const teamLimit = app.license.get('teams')
        const teamCount = await app.db.models.Team.count()
        if (teamCount >= teamLimit) {
            const resp = { code: 'team_limit_reached', error: 'Unable to auto create user team: license limit reached' }
            await app.auditLog.User.account.verify.verifyToken(verifiedUser, resp)
            throw new Error('team_limit_reached')
            // reply.code(400).send(resp)
            // return
        }
        // only create a personal team if no other teams exist
        if (!((await app.db.models.Team.forUser(verifiedUser)).length)) {
            let teamTypeId = app.settings.get('user:team:auto-create:teamType')

            if (!teamTypeId) {
                // No team type set - pick the 'first' one based on 'order'
                const teamTypes = await app.db.models.TeamType.findAll({ where: { active: true }, order: [['order', 'ASC']], limit: 1 })
                teamTypeId = teamTypes[0].id
            } else {
                teamTypeId = app.db.models.TeamType.decodeHashid(teamTypeId)
            }
            const teamProperties = {
                name: `Team ${verifiedUser.name}`,
                slug: verifiedUser.username,
                TeamTypeId: teamTypeId
            }
            const team = await app.db.controllers.Team.createTeamForUser(teamProperties, verifiedUser)
            await app.auditLog.Platform.platform.team.created(verifiedUser, null, team)
            await app.auditLog.User.account.verify.autoCreateTeam(verifiedUser, null, team)

            if (app.license.active() && app.billing) {
                // This checks to see if the team should be in trial mode
                await app.billing.setupTrialTeamSubscription(team, verifiedUser)
            }
        }
    }
    const pendingInvitations = await app.db.models.Invitation.forExternalEmail(verifiedUser.email)
    for (let i = 0; i < pendingInvitations.length; i++) {
        const invite = pendingInvitations[i]
        // For now we'll auto-accept any invites for this user
        // See https://github.com/FlowFuse/flowfuse/issues/275#issuecomment-1040113991
        await app.db.controllers.Invitation.acceptInvitation(invite, verifiedUser)
        // // If we go back to having the user be able to accept invites
        // // as a secondary step, the following code will convert the external
        // // invite into an internal one.
        // invite.external = false
        // invite.inviteeId = verifiedUser.id
        // await invite.save()
    }
    await app.auditLog.User.account.verify.verifyToken(verifiedUser, null)

    // only create a starting instance if the flag is set and this user and their teams have no instances
    if (app.settings.get('user:team:auto-create:instanceType') &&
    !((await app.db.models.Project.byUser(verifiedUser)).length)) {
        const instanceTypeId = app.settings.get('user:team:auto-create:instanceType')

        const instanceType = await app.db.models.ProjectType.byId(instanceTypeId)
        const instanceStack = await instanceType?.getDefaultStack() || (await instanceType.getProjectStacks())?.[0]
        const instanceTemplate = await app.db.models.ProjectTemplate.findOne({ where: { active: true } })

        const userTeamMemberships = await app.db.models.Team.forUser(verifiedUser)
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

        const userTeam = userTeamMemberships[0].Team

        const applications = await app.db.models.Application.byTeam(userTeam.id)
        let application
        if (applications.length > 0) {
            application = applications[0]
        } else {
            const applicationName = `${verifiedUser.name}'s Application`

            application = await app.db.models.Application.create({
                name: applicationName.charAt(0).toUpperCase() + applicationName.slice(1),
                TeamId: userTeam.id
            })

            await app.auditLog.User.account.verify.autoCreateTeam(verifiedUser, null, application)
        }

        const safeTeamName = userTeam.name.toLowerCase().replace(/[\W_]/g, '-')
        const safeUserName = verifiedUser.username.toLowerCase().replace(/[\W_]/g, '-')

        const instanceProperties = {
            name: `${safeTeamName}-${safeUserName}-${crypto.randomBytes(4).toString('hex')}`
        }
        const instance = await app.db.controllers.Project.create(userTeam, application, verifiedUser, instanceType, instanceStack, instanceTemplate, instanceProperties)

        await app.auditLog.User.account.verify.autoCreateInstance(verifiedUser, null, instance)
    }
}
