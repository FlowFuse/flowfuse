module.exports = {
    invitationList: function(db, invitations) {
        return invitations.map((t) => {
            const d = t.get({plain:true});
            const result = {
                id: d.hashid,
                createdAt: d.createdAt,
                expiresAt: d.expiresAt,
                sentAt: d.sentAt,
                team: db.views.Team.teamSummary(t.team),
                invitor: db.views.User.publicUserProfile(d.invitor)
            };
            if (d.external) {
                result.invitee = {
                    external: true,
                    email: d.email
                }
            } else {
                result.invitee = db.views.User.publicUserProfile(d.invitee)
            }
            return result;
        });
    },
}
