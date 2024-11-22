const { Op } = require('sequelize')

const { randomInt } = require('../utils')

module.exports = {
    name: 'inviteReminder',
    startup: false,
    // This fixed time will not work well when horizontal scaling
    // will need to find a way to pick a "leader"
    schedule: `38 3 * * *`,
    run: async function (app) {
        try {
        // need to iterate over invitations and send email to all over 
        // 2 days old, but less than 3 days.
        const twoDays = new Date()
        twoDays.setDate(twoDays.getDate() - 2)
        const threeDays = new Date()
        threeDays.setDate(threeDays.getDate() - 3)
        console.log(twoDays.toISOString(), threeDays.toISOString())
        const invites = await app.db.models.Invitation.findAll({
            where: {
                createdAt: {
                    [Op.between]: [threeDays, twoDays]
                }
            },
            include: [
                { model: app.db.models.User, as: 'invitor'},
                { model: app.db.models.User, as: 'invitee'}
            ]
        })

        
        for(const invite of invites) {
            const expiryDate = invite.expiresAt.toDateString()
            if (invite.invitee) {
                // Existing user
                await app.postoffice.send(invite.invitee, 'TeamInviteReminder',{
                    teamName: invite.team.name,
                    signupLink: `${app.config.base_url}/account/teams/invitations`,
                    expiryDate
                })
            } else if (invite.email) {
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
        }
        } catch (err) {
            console.log(err)
        }
    }
}