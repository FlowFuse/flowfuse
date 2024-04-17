const { DataTypes } = require('sequelize')

const { generateToken } = require('../utils')

/**
 * An invite to join a team.
 *
 * The invite can be to either an existing user (external: false)
 * or to an external user (external: true)
 *
 *
 * @namespace forge.db.models.Invitation
 */

const DEFAULT_INVITATION_EXPIRY = 7000 * 60 * 60 * 24 // Seven days

module.exports = {
    name: 'Invitation',
    schema: {
        token: { type: DataTypes.STRING, unique: true },
        external: { type: DataTypes.BOOLEAN, allowNull: false },
        expiresAt: { type: DataTypes.DATE },
        email: { type: DataTypes.STRING, allowNull: true },
        sentAt: { type: DataTypes.DATE, allowNull: true },
        role: {
            type: DataTypes.INTEGER
        }
        // invitorId
        // inviteeId
    },
    hooks: {
        beforeCreate: (invitation) => {
            invitation.token = generateToken(32, 'ffi')
            if (!invitation.expiresAt) {
                invitation.expiresAt = Date.now() + DEFAULT_INVITATION_EXPIRY
            }
        }
    },
    associations: function (M) {
        this.belongsTo(M.User, { as: 'invitor' })
        this.belongsTo(M.User, { as: 'invitee' })
        this.belongsTo(M.Team, { as: 'team' })
    },
    scopes: {
        team (team) {
            return {
                where: {
                    teamId: team.id
                }
            }
        },
        invitor (user) {
            return {
                where: {
                    invitorId: user.id
                }
            }
        },
        invitee (user) {
            return {
                where: {
                    inviteeId: user.id
                }
            }
        }
    },
    finders: function (M) {
        return {
            static: {
                get: async (pagination = {}) => {
                    return this.findAll({
                        include: [
                            { model: M.Team, as: 'team' },
                            { model: M.User, as: 'invitor' },
                            { model: M.User, as: 'invitee' }
                        ]
                    })
                },
                byId: async (hashid, invitee) => {
                    const id = M.Invitation.decodeHashid(hashid)
                    const where = { id }
                    if (invitee) {
                        where.inviteeId = invitee.id
                    }
                    return this.findOne({
                        where,
                        include: [
                            { model: M.Team, as: 'team' },
                            { model: M.User, as: 'invitor' },
                            { model: M.User, as: 'invitee' }
                        ]
                    })
                },
                forTeam: async (team) => {
                    return this.scope({ method: ['team', team] }).findAll({
                        include: [
                            { model: M.Team, as: 'team' },
                            { model: M.User, as: 'invitor' },
                            { model: M.User, as: 'invitee' }
                        ]
                    })
                },
                // fromUser: async (user) => {
                //     return this.scope({method:['invitor',user]}).findAll({
                //         include:[
                //             {model: M['User'], as: "invitor"},
                //             {model: M['User'], as: "invitee"}
                //         ]
                //     });
                // },
                forUser: async (user) => {
                    return this.scope({ method: ['invitee', user] }).findAll({
                        include: [
                            { model: M.Team, as: 'team' },
                            { model: M.User, as: 'invitor' },
                            { model: M.User, as: 'invitee' }
                        ]
                    })
                },
                forExternalEmail: async (email) => {
                    return this.findAll({
                        where: {
                            external: true,
                            email
                        },
                        include: [
                            { model: M.Team, as: 'team' },
                            { model: M.User, as: 'invitor' },
                            { model: M.User, as: 'invitee' }
                        ]
                    })
                }
            }
        }
    }
}
