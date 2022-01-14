/**
 * A Team
 * @namespace forge.db.models.Team
 */

const { DataTypes,literal } = require('sequelize');
const { slugify, generateTeamAvatar } = require("../utils");

module.exports = {
    name: 'Team',
    schema: {
        name: { type: DataTypes.STRING, allowNull: false },
        slug: { type: DataTypes.STRING, unique: true, validate: { is: /^[a-z0-9-_]+$/i }},
        avatar: {type: DataTypes.STRING }
    },
    hooks: {
        beforeSave: (team, options) => {
            if (!team.avatar) {
                team.avatar = generateTeamAvatar(team.name)
            }
            if (!team.slug) {
                team.slug = slugify(team.name)
            }
            team.slug = team.slug.toLowerCase();
        },
        beforeDestroy: async(team, opts) => {
            const projectCount = await team.projectCount();
            if (projectCount > 0) {
                throw new Error("Cannot delete team that owns projects");
            }
        },
        afterDestroy: async (team, opts) => {
            // TODO: what needs tidying up after a team is deleted?
        }
    },
    associations: function(M) {
        this.belongsToMany(M['User'], { through: M['TeamMember']})
        this.hasMany(M['TeamMember'])
        this.hasMany(M['Project'])
        this.hasMany(M['Invitation'], { foreignKey: 'teamId' })
    },
    finders: function(M) {
        const self = this;
        return {
            static: {
                byId: async function(id) {
                    if (typeof id === "string") {
                        id = M['Team'].decodeHashid(id);
                    }
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
                                        FROM "Projects" AS "project"
                                        WHERE
                                        "project"."TeamId" = "Team"."id"
                                    )`),
                                    'projectCount'
                                ],
                                [
                                    literal(`(
                                        SELECT COUNT(*)
                                        FROM "TeamMembers" AS "members"
                                        WHERE
                                        "members"."TeamId" = "Team"."id"
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
                                        FROM "Projects" AS "project"
                                        WHERE
                                        "project"."TeamId" = "TeamMember"."TeamId"
                                    )`),
                                    'projectCount'
                                ],
                                [
                                    literal(`(
                                        SELECT COUNT(*)
                                        FROM "TeamMembers" AS "members"
                                        WHERE
                                        "members"."TeamId" = "Team"."id"
                                    )`),
                                    'memberCount'
                                ]
                            ]
                        }
                    })
                },
                getAll: async(pagination={}) => {
                    const limit = parseInt(pagination.limit) || 30;
                    const where = {};
                    if (pagination.cursor) {
                        where.id = { [Op.gt]: M['Team'].decodeHashid(pagination.cursor) }
                    }
                    const {count, rows} = await this.findAndCountAll({
                        where,
                        order: [['id', 'ASC']],
                        limit,
                        attributes: {
                            include: [
                                [
                                    literal(`(
                                        SELECT COUNT(*)
                                        FROM "Projects" AS "project"
                                        WHERE
                                        "project"."TeamId" = "Team"."id"
                                    )`),
                                    'projectCount'
                                ],
                                [
                                    literal(`(
                                        SELECT COUNT(*)
                                        FROM "TeamMembers" AS "members"
                                        WHERE
                                        "members"."TeamId" = "Team"."id"
                                    )`),
                                    'memberCount'
                                ]
                            ]
                        }
                    });
                    return {
                        meta: {
                            next_cursor: rows.length === limit?rows[rows.length-1].hashid:undefined
                        },
                        count: count,
                        teams: rows
                    }
                }
            },
            instance: {
                members: async function(role) {
                    return this.Users.filter(u => !role || u.TeamMember.role === role );
                },
                owners: async function() {
                    // All Team owners
                    return M['TeamMember'].scope('owners').findAll()
                },
                projectCount: async function() {
                    return await M['Project'].count({where: {TeamId: this.id}})
                }
            }
        }
    }
}
