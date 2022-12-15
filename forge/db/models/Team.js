/**
 * A Team
 * @namespace forge.db.models.Team
 */

const { DataTypes, literal } = require('sequelize')
const { slugify, generateTeamAvatar, buildPaginationSearchClause } = require('../utils')
const { Roles } = require('../../lib/roles')

module.exports = {
    name: 'Team',
    schema: {
        name: { type: DataTypes.STRING, allowNull: false, validate: { not: /:\/\// } },
        slug: { type: DataTypes.STRING, unique: true, validate: { is: /^[a-z0-9-_]+$/i } },
        avatar: { type: DataTypes.STRING }
    },
    hooks: function (M, app) {
        return {
            beforeCreate: async (team, options) => {
                if (!team.TeamTypeId) {
                    throw new Error('Cannot create team without TeamTypeId')
                }
                const teamLimit = app.license.get('teams')
                const teamCount = await M.Team.count()
                if (teamCount >= teamLimit) {
                    throw new Error('license limit reached')
                }
            },
            beforeSave: (team, options) => {
                if (!team.avatar) {
                    team.avatar = generateTeamAvatar(team.name)
                }
                if (!team.slug) {
                    team.slug = slugify(team.name)
                }
                team.slug = team.slug.toLowerCase()
            },
            beforeDestroy: async (team, opts) => {
                const projectCount = await team.projectCount()
                if (projectCount > 0) {
                    throw new Error('Cannot delete team that owns projects')
                }
            },
            afterDestroy: async (team, opts) => {
                // TODO: what needs tidying up after a team is deleted?
                // Doing this here also clears historical invites.
                // TeamId is null because there is a cascade rule
                await M.Invitation.destroy({
                    where: {
                        teamId: null
                    }
                })
            }
        }
    },
    associations: function (M) {
        this.belongsToMany(M.User, { through: M.TeamMember })
        this.belongsTo(M.TeamType)
        this.hasMany(M.TeamMember)
        this.hasMany(M.Device)
        this.hasMany(M.Project)
        this.hasMany(M.Invitation, { foreignKey: 'teamId' })
    },
    finders: function (M) {
        const self = this
        return {
            static: {
                byId: async function (id) {
                    if (typeof id === 'string') {
                        id = M.Team.decodeHashid(id)
                    }
                    return self.findOne({
                        where: { id },
                        include: [{
                            model: M.TeamType
                        }],
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
                bySlug: async function (slug) {
                    return self.findOne({
                        where: { slug },
                        include: [{
                            model: M.TeamType
                        }],
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
                byName: async function (name) {
                    // This is primarily used by the unit tests.
                    return self.findOne({
                        where: { name },
                        include: [{
                            model: M.TeamType
                        }]
                    })
                },
                forUser: async function (User) {
                    return M.TeamMember.findAll({
                        where: {
                            UserId: User.id
                        },
                        include: {
                            model: M.Team,
                            attributes: ['hashid', 'links', 'id', 'name', 'avatar', 'slug'],
                            include: { model: M.TeamType, attributes: ['hashid', 'id', 'name'] }
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
                getAll: async (pagination = {}, where = {}) => {
                    const limit = parseInt(pagination.limit) || 1000
                    if (pagination.cursor) {
                        pagination.cursor = M.Team.decodeHashid(pagination.cursor)
                    }
                    const [rows, count] = await Promise.all([
                        this.findAll({
                            where: buildPaginationSearchClause(pagination, where, ['Team.name']),
                            order: [['id', 'ASC']],
                            limit,
                            include: { model: M.TeamType, attributes: ['hashid', 'id', 'name'] },
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
                        }),
                        this.count({ where })
                    ])
                    return {
                        meta: {
                            next_cursor: rows.length === limit ? rows[rows.length - 1].hashid : undefined
                        },
                        count,
                        teams: rows
                    }
                }
            },
            instance: {
                memberCount: async function (role) {
                    const where = {
                        TeamId: this.id
                    }
                    if (role !== undefined) {
                        where.role = role
                    }
                    return await M.TeamMember.count({ where })
                },
                ownerCount: async function () {
                    // All Team owners
                    return this.memberCount(Roles.Owner)
                },
                projectCount: async function () {
                    return await M.Project.count({ where: { TeamId: this.id } })
                },
                pendingInviteCount: async function () {
                    return await M.Invitation.count({ where: { teamId: this.id } })
                },
                deviceCount: async function () {
                    return await M.Device.count({ where: { TeamId: this.id } })
                }
            }
        }
    }
}
