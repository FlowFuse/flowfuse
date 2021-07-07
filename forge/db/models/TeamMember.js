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
    options: {
        timestamps: false,

    },
    associations: function(M) {
        this.belongsTo(M['User']);
        this.belongsTo(M['Team']);
    }
}
