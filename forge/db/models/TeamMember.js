/**
 * A TeamMember
 *
 * This is the association model between User and Team
 * @namespace forge.db.models.TeamMember
 */
const { Roles, TeamRoles } = require("../../lib/roles");
const { DataTypes } = require('sequelize');

module.exports = {
    name: 'TeamMember',
    schema: {
        role: {
            type: DataTypes.INTEGER, allowNull: false,
            validate: {
                isValid(role) {
                    if (!TeamRoles.includes(role)) {
                        throw new Error("Invalid team role")
                    }
                }
            }
        }
    },
    scopes: {
        members: {
            where:{ role: Roles.Member }
        },
        owners:{
            where:{ role: Roles.Owner }
        }
    },
    finders: function(M) {
        return {
            static: {
                getTeamMembership: async (userId, teamId, includeTeam) => {
                    if (typeof teamId === 'string') {
                        teamId = M['Team'].decodeHashid(teamId);
                    }
                    if (typeof userId === 'string') {
                        userId = M['User'].decodeHashid(userId);
                    }
                    const opts = {
                        where: {
                            TeamId: teamId,
                            UserId: userId
                        }
                    }
                    if (includeTeam) {
                        opts.include = {
                            model: M['Team']
                        }
                    }
                    return this.findOne(opts)
                },
            }
        }
    },
    options: {
        timestamps: false,
    },
    associations: function(M) {
        this.belongsTo(M['User']);
        this.belongsTo(M['Team']);
    }
}
