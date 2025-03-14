module.exports = function (app) {
    app.addSchema({
        $id: 'Invitation',
        type: 'object',
        allOf: [{ $ref: 'UserSummary' }],
        properties: {
            id: { type: 'string' },
            role: { type: 'number' },
            createdAt: { type: 'string' },
            expiresAt: { type: 'string' },
            sentAt: { type: 'string' },
            team: { $ref: 'TeamSummary' },
            invitor: { $ref: 'UserSummary' },
            invitee: {
                allOf: [
                    { $ref: 'UserSummary' },
                    {
                        properties: {
                            external: { type: 'boolean' },
                            email: { type: 'string' }
                        }
                    }
                ]
            }
        }
    })

    app.addSchema({
        $id: 'InvitationList',
        type: 'array',
        items: {
            $ref: 'Invitation'
        }
    })

    function invitation (t) {
        const d = t.get({ plain: true })
        const result = {
            id: d.hashid,
            role: d.role,
            createdAt: d.createdAt,
            expiresAt: d.expiresAt,
            sentAt: d.sentAt,
            team: app.db.views.Team.teamSummary(t.team),
            invitor: app.db.views.User.userSummary(d.invitor)
        }
        if (d.external) {
            result.invitee = {
                external: true,
                email: d.email
            }
        } else {
            result.invitee = app.db.views.User.userSummary(d.invitee)
        }
        return result
    }

    function invitationList (invitations) {
        return invitations.map((t) => invitation(t))
    }

    return {
        invitation,
        invitationList
    }
}
