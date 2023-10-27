/**
 * A TeamMember
 *
 * This is the association model between User and Team
 * @namespace forge.db.models.TeamMember
 */
const { DataTypes } = require('sequelize')

const { Roles, TeamRoles } = require('../../lib/roles')

module.exports = {
    name: 'TeamMember',
    schema: {
        role: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: {
                isValid (role) {
                    if (!TeamRoles.includes(role)) {
                        throw new Error('Invalid team role')
                    }
                }
            }
        },
        samlAdded: { type: DataTypes.BOOLEAN, defaultValue: false }
    },
    scopes: {
        members: {
            where: { role: Roles.Member }
        },
        owners: {
            where: { role: Roles.Owner }
        }
    },
    finders: function (M) {
        return {
            static: {
                getTeamsOwnedBy: async (userId) => {
                    if (typeof userId === 'string') {
                        userId = M.User.decodeHashid(userId)
                    }
                    return this.findAll({
                        where: {
                            UserId: userId,
                            role: Roles.Owner
                        },
                        include: {
                            model: M.Team
                        }
                    })
                },
                getSAMLAssignedTeamsBy: async (userId) => {
                    if (typeof userId === 'string') {
                        userId = M.User.decodeHashid(userId)
                    }
                    return this.findAll({
                        where: {
                            UserId: userId,
                            samlAdded: true
                        },
                        include: {
                            model: M.Team
                        }
                    })
                },
                getTeamMembership: async (userId, teamId, includeTeam) => {
                    if (typeof teamId === 'string') {
                        teamId = M.Team.decodeHashid(teamId)
                    }
                    if (typeof userId === 'string') {
                        userId = M.User.decodeHashid(userId)
                    }
                    const opts = {
                        where: {
                            TeamId: teamId,
                            UserId: userId
                        }
                    }
                    if (includeTeam) {
                        opts.include = {
                            model: M.Team
                        }
                    }
                    return this.findOne(opts)
                }
            }
        }
    },
    options: {
        timestamps: false
    },
    associations: function (M) {
        this.belongsTo(M.User)
        this.belongsTo(M.Team)
    }
}
