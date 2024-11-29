const { Op } = require('sequelize')

const { randomInt } = require('../utils')

module.exports = {
    name: 'inviteReminder',
    startup: false,
    // runs every 15mins with a random offset from the start of the hour
    schedule: `${randomInt(0, 15)}/15 * * * *`,
    run: async function (app) {
        // need to iterate over invitations and send email to all over
        // 2 days old, but less than 3 days.
        const twoDays = new Date()
        twoDays.setDate(twoDays.getDate() - 2)
        const threeDays = new Date()
        threeDays.setDate(threeDays.getDate() - 3)
        const invites = await app.db.models.Invitation.findAll({
            where: {
                createdAt: {
                    [Op.between]: [threeDays, twoDays]
                },
                reminderSentAt: {
                    [Op.is]: null
                }
            },
            include: [
                { model: app.db.models.User, as: 'invitor' },
                { model: app.db.models.User, as: 'invitee' },
                { model: app.db.models.Team, as: 'team' }
            ]
        })

        for (const invite of invites) {
            const expiryDate = invite.expiresAt.toDateString()
            let invitee = ''
            if (invite.invitee) {
                invitee = invite.invitee.name
                // Existing user
                await app.postoffice.send(invite.invitee, 'TeamInviteReminder', {
                    teamName: invite.team.name,
                    signupLink: `${app.config.base_url}/account/teams/invitations`,
                    expiryDate
                })
            } else if (invite.email) {
                invitee = invite.email
                // External user
                let signupLink = `${app.config.base_url}/account/create?email=${encodeURIComponent(invite.email)}`
                if (app.license.active()) {
                    // Check if this is for an SSO-enabled domain with auto-create turned on
                    const providerConfig = await app.db.models.SAMLProvider.forEmail(invite.email)
                    if (providerConfig?.options?.provisionNewUsers) {
                        signupLink = `${app.config.base_url}`
                    }
                }

                await app.postoffice.send(invite, 'UnknownUserInvitationReminder', {
                    invite,
                    signupLink,
                    expiryDate
                })
            }
            invite.reminderSentAt = Date.now()
            await invite.save()

            // send reminder to Invitor
            await app.postoffice.send(invite.invitor, 'TeamInviterReminder', {
                teamName: invite.team.name,
                invitee,
                expiryDate
            })
        }
    }
}
