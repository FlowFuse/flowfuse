module.exports = {
    invitationList: function (app, invitations) {
        return invitations.map((t) => {
            const d = t.get({ plain: true })
            const result = {
                id: d.hashid,
                role: d.role,
                createdAt: d.createdAt,
                expiresAt: d.expiresAt,
                sentAt: d.sentAt,
                team: app.db.views.Team.teamSummary(t.team),
                invitor: app.db.views.User.publicUserProfile(d.invitor)
            }
            if (d.external) {
                result.invitee = {
                    external: true,
                    email: d.email
                }
            } else {
                result.invitee = app.db.views.User.publicUserProfile(d.invitee)
            }
            return result
        })
    }
}
