/**
 * A Team
 * @namespace forge.db.models.Team
 */

const { DataTypes,literal } = require('sequelize');

module.exports = {
    name: 'Team',
    schema: {
        name: { type: DataTypes.STRING, allowNull: false },
        slug: { type: DataTypes.STRING, unique: true },
        avatar: {type: DataTypes.STRING }
    },
    hooks: {
        beforeSave: (team, options) => {
            if (!team.avatar) {
                const cleanEmail = team.name;
                const emailHash = require("crypto").createHash('md5').update(cleanEmail).digest("hex")
                team.avatar = `//www.gravatar.com/avatar/${emailHash}?d=identicon` //retro mp
            }
            if (!team.slug) {
                team.slug = team.name.trim().toLowerCase().replace(/ /g,"-").replace(/[^a-z0-9-_]/ig,"");
            }
            team.slug = team.slug.toLowerCase();
        }
    },
    associations: function(M) {
        this.belongsToMany(M['User'], { through: M['TeamMember']})
        this.hasMany(M['TeamMember'])
        this.hasMany(M['Project'])
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
                },
                bySlug: async function(slug) {
                    return self.findOne({where:{slug}, include:{
                        model:M['User'],
                        attributes:['name','avatar','id'],
                        through: {
                            model:M['TeamMembers'], // .scope('owners'),
                            attributes:['role']
                        }
                    }})
                },
                forUser: async function(User) {
                    return M['TeamMember'].findAll({
                        where: {
                            UserId: User.id
                        },
                        include: {
                            model:M['Team'],
                            attributes:['hashid','links','id','name','avatar','slug']
                        },
                        attributes: {
                            include: [
                                [
                                    literal(`(
                                        SELECT COUNT(*)
                                        FROM Projects AS project
                                        WHERE
                                        project.TeamId = teamMember.TeamId
                                    )`),
                                    'projectCount'
                                ]
                            ]
                        }
                    })
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
