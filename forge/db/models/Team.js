/**
 * A Team
 * @namespace forge.db.models.Team
 */

const { DataTypes } = require('sequelize');

module.exports = {
    name: 'Team',
    schema: {
        name: { type: DataTypes.STRING, allowNull: false },
    },
    associations: function(M) {
        this.belongsToMany(M['User'], { through: M['TeamMember']})
        this.hasMany(M['TeamMember'])
        this.belongsToMany(M['Instance'], {through: M['InstanceTeam']})
    },
    finders: function(M) {
        const self = this;
        return {
            static: {
                byName: async function(name) {
                    return self.findOne({where:{name}, include:{
                        model:M['User'],
                        attributes:['name'],
                        through: {
                            model:M['TeamMembers'], // .scope('owners'),
                            attributes:['role']
                        }
                    }})
                }
            },
            instance: {
                members: async function(role) {
                    return this.Users.filter(u => !role || u.TeamMember.role === role );
                },
                owners: async function() {
                    // All Team owners
                    return M['TeamMember'].scope('owners').findAll()
                }
            }
        }
    }
}
