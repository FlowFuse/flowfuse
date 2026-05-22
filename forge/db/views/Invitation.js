module.exports = function (app) {
    app.addSchema({
        $id: 'Invitation',
        type: 'object',
        properties: {
            id: { type: 'string' },
            role: { type: 'number', nullable: true },
            createdAt: { type: 'string' },
            expiresAt: { type: 'string' },
            sentAt: { type: 'string', nullable: true },
            team: { $ref: 'TeamSummary' },
            invitor: { $ref: 'UserSummary' },
            invitee: {
                // UserSummary for internal invites, { external, email } for external.
                anyOf: [
                    { $ref: 'UserSummary' },
                    {
                        type: 'object',
                        properties: {
                            external: { type: 'boolean' },
                            email: { type: 'string' }
                        },
                        required: ['external', 'email'],
                        additionalProperties: false
                    }
                ]
            }
        },
        required: ['id', 'role', 'createdAt', 'expiresAt', 'sentAt', 'team', 'invitor', 'invitee'],
        additionalProperties: false
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
