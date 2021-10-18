/**
 * A TeamMember
 *
 * This is the association model between User and Team
 * @namespace forge.db.models.TeamMember
 */

const { DataTypes } = require('sequelize');

module.exports = {
    name: 'TeamMember',
    schema: {
        role: { type: DataTypes.STRING, allowNull: false }
    },
    scopes: {
        members: {
            where:{ role: "member" }
        },
        owners:{
            where:{ role: "owner" }
        }
    },
    finders: function(M) {
        return {
            static: {
                getTeamMembership: async (userId, teamId) => {
                    if (typeof teamId === 'string') {
                        teamId = M['Team'].decodeHashid(teamId);
                    }
                    if (typeof userId === 'string') {
                        userId = M['User'].decodeHashid(userId);
                    }
                    return this.findOne({where:{
                        TeamId: teamId,
                        UserId: userId
                    }});
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
