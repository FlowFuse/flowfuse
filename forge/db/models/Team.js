/**
 * A Team
 * @namespace forge.db.models.Team
 */

const { DataTypes,literal } = require('sequelize');
const { slugify, generateAvatar } = require("../utils");

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
                team.avatar = generateAvatar(team.name)
            }
            if (!team.slug) {
                team.slug = slugify(team.name)
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
                byId: async function(hashid) {
                    const id = M['Team'].decodeHashid(hashid);
                    return self.findOne({where:{id}, include:{
                        model:M['User'],
                        attributes:['name'],
                        through: {
                            model:M['TeamMembers'], // .scope('owners'),
                            attributes:['role']
                        }
                    }})
                },
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
                    return self.findOne({
                        where:{slug},
                        attributes: {
                            include: [
                                [
                                    literal(`(
                                        SELECT COUNT(*)
                                        FROM Projects AS project
                                        WHERE
                                        project.TeamId = team.id
                                    )`),
                                    'projectCount'
                                ],
                                [
                                    literal(`(
                                        SELECT COUNT(*)
                                        FROM TeamMembers AS members
                                        WHERE
                                        members.TeamId = team.id
                                    )`),
                                    'memberCount'
                                ]
                            ]
                        }
                    })
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
                                ],
                                [
                                    literal(`(
                                        SELECT COUNT(*)
                                        FROM TeamMembers AS members
                                        WHERE
                                        members.TeamId = team.id
                                    )`),
                                    'memberCount'
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
