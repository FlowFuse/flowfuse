/**
 * A User
 * @namespace forge.db.models.User
 */
const { DataTypes, Op, fn, col, where } = require('sequelize')

const { Roles } = require('../../lib/roles.js')
const { hash, generateUserAvatar, buildPaginationSearchClause } = require('../utils')

module.exports = {
    name: 'User',
    schema: {
        username: { type: DataTypes.STRING, allowNull: false, unique: true },
        name: { type: DataTypes.STRING, validate: { not: /:\/\// } },
        email: { type: DataTypes.STRING, unique: true, validate: { isEmail: true } },
        email_verified: { type: DataTypes.BOOLEAN, defaultValue: false },
        sso_enabled: { type: DataTypes.BOOLEAN, defaultValue: false },
        mfa_enabled: { type: DataTypes.BOOLEAN, defaultValue: false },
        password: {
            type: DataTypes.STRING,
            set (value) {
                if (value.length < 8) {
                    throw new Error('Password too short')
                }
                this.setDataValue('password', hash(value))
            }
        },
        password_expired: { type: DataTypes.BOOLEAN, defaultValue: false },
        admin: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        avatar: {
            type: DataTypes.STRING,
            get () {
                const avatar = this.getDataValue('avatar')
                if (avatar) {
                    return `${process.env.FLOWFORGE_BASE_URL}${avatar}`
                } else {
                    return avatar
                }
            }
        },
        tcs_accepted: { type: DataTypes.DATE, allowNull: true },
        suspended: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        SSOGroups: {
            type: DataTypes.TEXT,
            allowNull: true,
            get () {
                const rawValue = this.getDataValue('SSOGroups')
                if (rawValue) {
                    return JSON.parse(rawValue)
                } else {
                    return []
                }
            },
            set (value) {
                if (value) {
                    this.setDataValue('SSOGroups', JSON.stringify(value))
                }
            }
        }
    },
    indexes: [
        { name: 'user_username_lower_unique', fields: [fn('lower', col('username'))], unique: true },
        { name: 'user_email_lower_unique', fields: [fn('lower', col('email'))], unique: true }
    ],
    scopes: {
        admins: { where: { admin: true } }
    },
    hooks: function (M, app) {
        return {
            beforeCreate: async (user, options) => {
                // if the product is licensed, we permit overage
                const isLicensed = app.license.active()
                if (isLicensed !== true) {
                    const { users } = await app.license.usage('users')
                    if (users.count >= users.limit) {
                        throw new Error('license limit reached')
                    }
                }
                if (!user.avatar) {
                    user.avatar = generateUserAvatar(user.name || user.username)
                }
                if (!user.name) {
                    user.name = user.username
                }
            },
            afterCreate: async (user, options) => {
                const { users } = await app.license.usage('users')
                if (users.count > users.limit) {
                    await app.auditLog.Platform.platform.license.overage('system', null, users)
                }
            },
            beforeUpdate: async (user) => {
                if (user._previousDataValues.admin === true && user.admin === false) {
                    const currentAdmins = await app.db.models.User.scope('admins').findAll()
                    if (currentAdmins.length <= 1) {
                        throw new Error('Cannot remove last Admin user')
                    }
                }
                if (user.avatar.startsWith(`${process.env.FLOWFORGE_BASE_URL}/avatar/`)) {
                    user.avatar = generateUserAvatar(user.name || user.username)
                }
            },
            beforeDestroy: async (user, opts) => {
                // determine if this user is an admin whether they are the only admin
                // throw an error if they are the only admin as we dont want to orphan platform
                if (user.admin) {
                    const adminCount = await app.db.models.User.scope('admins').count()
                    // const adminCount = (await app.forge.db.models.User.admins()).length
                    if (adminCount <= 1) {
                        throw new Error('Cannot delete the last platform administrator')
                    }
                }

                // determine if this user owns any teams
                // throw an error if we would orphan any teams
                const teams = await app.db.models.Team.forUser(user)
                const teamBlockers = []
                const ownedTeams = []
                for (const team of teams) {
                    const owners = await team.Team.getOwners()
                    const isOwner = owners.find((owner) => owner.id === user.id)

                    if (isOwner && owners.length <= 1) {
                        const instanceCount = await team.Team.instanceCount()
                        const deviceCount = await team.Team.deviceCount()
                        const members = await team.Team.memberCount()

                        ownedTeams.push(team.Team)

                        // throw error if the team has other members assigned to it
                        if (members > 1) {
                            teamBlockers.push(`Team ${team.Team.name} which is being deleted alongside your account still has users in it.`)
                        }

                        // throw error if the team has remaining instances assigned to it
                        if (instanceCount > 0) {
                            teamBlockers.push(`Team ${team.Team.name} which is being deleted alongside your account still has instances assigned to it.`)
                        }

                        // throw error if the team has remaining devices assigned to it
                        if (deviceCount > 0) {
                            teamBlockers.push(`Team ${team.Team.name} which is being deleted alongside your account still has devices assigned to it.`)
                        }
                    }
                }

                if (teamBlockers.length) {
                    throw new Error(teamBlockers[0])
                }

                // delete remaining owned teams
                for (const ownedTeam of ownedTeams) {
                    await ownedTeam.destroy()
                }

                // Need to do this in beforeDestroy as the Session.UserId field
                // is set to NULL when user is deleted.
                // TODO: modify cascade delete relationship between the tables
                await M.Session.destroy({
                    where: {
                        UserId: user.id
                    }
                })
                await M.Invitation.destroy({
                    where: {
                        [Op.or]: [{ invitorId: user.id }, { inviteeId: user.id }]
                    }
                })
                await M.AccessToken.destroy({
                    where: {
                        ownerType: 'user',
                        ownerId: '' + user.id
                    }
                })
                await M.AccessToken.destroy({
                    where: {
                        ownerType: 'npm',
                        ownerId: {
                            [Op.like]: user.username
                        }

                    }
                })
            }
        }
    },
    associations: function (M) {
        this.belongsToMany(M.Team, { through: M.TeamMember })
        this.hasMany(M.TeamMember)
        this.hasMany(M.Session)
        this.hasMany(M.Invitation, { foreignKey: 'invitorId' })
        this.hasMany(M.Invitation, { foreignKey: 'inviteeId' })
        this.belongsTo(M.Team, { as: 'defaultTeam' })
    },
    finders: function (M, app) {
        return {
            static: {
                admins: async () => {
                    return this.scope('admins').findAll()
                },
                byId: async (id) => {
                    if (typeof id === 'string') {
                        id = M.User.decodeHashid(id)
                    }
                    return this.findOne({
                        where: { id },
                        include: {
                            model: M.Team,
                            attributes: ['name'],
                            through: {
                                attributes: ['role', 'permissions']
                            }
                        }
                    })
                },
                byUsername: async (username) => {
                    return this.findOne({
                        where: where(
                            fn('lower', col('username')),
                            username.toLowerCase()
                        ),
                        include: {
                            model: M.Team,
                            attributes: ['name'],
                            through: {
                                attributes: ['role', 'permissions']
                            }
                        }
                    })
                },
                byEmail: async (email) => {
                    return this.findOne({
                        where: where(
                            fn('lower', col('email')),
                            email.toLowerCase()
                        ),
                        include: {
                            model: M.Team,
                            attributes: ['name'],
                            through: {
                                attributes: ['role', 'permissions']
                            }
                        }
                    })
                },
                byName: async (name) => {
                    return this.findOne({
                        where: { name },
                        include: {
                            model: M.Team,
                            attributes: ['name'],
                            through: {
                                attributes: ['role', 'permissions']
                            }
                        }
                    })
                },
                byUsernameOrEmail: async (name) => {
                    return this.findOne({
                        where: where(
                            fn('lower', col(/.+@.+/.test(name) ? 'email' : 'username')),
                            name.toLowerCase()
                        ),
                        include: {
                            model: M.Team,
                            attributes: ['name'],
                            through: {
                                attributes: ['role', 'permissions']
                            }
                        }
                    })
                },
                inTeam: async (teamHashId) => {
                    const teamId = M.Team.decodeHashid(teamHashId)
                    return M.User.findAll({
                        include: {
                            model: M.Team,
                            attributes: ['name'],
                            where: { id: teamId },
                            through: {
                                attributes: ['role', 'permissions']
                            }
                        }
                    })
                },
                getAll: async (pagination = {}, where = {}) => {
                    const limit = parseInt(pagination.limit) || 1000
                    if (pagination.cursor) {
                        pagination.cursor = M.User.decodeHashid(pagination.cursor)
                    }
                    const [rows, count] = await Promise.all([
                        this.findAll({
                            where: buildPaginationSearchClause(pagination, where, ['User.username', 'User.name', 'User.email']),
                            order: [['id', 'ASC']],
                            limit
                        }),
                        this.count({ where })
                    ])
                    return {
                        meta: {
                            next_cursor: rows.length === limit ? rows[rows.length - 1].hashid : undefined
                        },
                        count,
                        users: rows
                    }
                },
                /**
                 * Get users with a particular role
                 * @param {Array} roles An array of valid user roles
                 * @param {Object} options Options
                 * @param {Boolean} options.count only return a count of results
                 * @param {Boolean} options.summary whether to return a limited user object that only contains id: default false
                 * @param {Array} options.teamTypes limit to teams of certain types
                 * @param {Array} options.billing array of billing states to include
                 * @returns Array of users who have at least one of the specific roles, or a count
                 */
                byTeamRole: async (roles = [], options) => {
                    options = {
                        summary: false,
                        count: false,
                        ...options
                    }
                    let attributes
                    if (options.summary) {
                        attributes = ['id']
                    }
                    const includesAdmins = roles.includes(Roles.Admin)
                    const where = {
                        [Op.or]: [
                            includesAdmins ? { admin: true } : {},
                            { '$TeamMembers.role$': { [Op.in]: roles } }
                        ]
                    }
                    const query = {
                        where,
                        include: {
                            model: M.TeamMember,
                            attributes: ['role', 'permissions'],
                            include: {
                                model: M.Team,
                                attributes: ['suspended', 'TeamTypeId'],
                                where: {
                                    // Never include suspended teams
                                    suspended: false
                                }
                            }
                        }
                    }
                    if (options.teamTypes) {
                        query.include.include.where.TeamTypeId = { [Op.in]: options.teamTypes }
                        if (options.billing) {
                            query.include.include.include = {
                                model: app.db.models.Subscription,
                                attributes: ['status'],
                                where: {
                                    status: { [Op.in]: options.billing.map(opt => opt.toLowerCase()) }
                                }
                            }
                        }
                    }
                    if (!options.count) {
                        query.attributes = attributes
                        return M.User.findAll(query)
                    } else {
                        // Must set distinct otherwise Model.count will include
                        // users in multiple teams multiple times.
                        query.distinct = true
                        return M.User.count(query)
                    }
                }
            },
            instance: {
                // get the team membership for the given team
                // `teamId` can be either a number (the raw id) or a string (the hashid).
                // TODO: standardize on using hashids externally
                getTeamMembership: async function (teamId, includeTeam) {
                    return M.TeamMember.getTeamMembership(this.id, teamId, includeTeam)
                },
                getTeamsOwned: async function () {
                    return M.TeamMember.getTeamsOwnedBy(this.id)
                },
                getTeamMemberships: async function (includeTeam = false) {
                    return M.TeamMember.getTeamsForUser(this.id, includeTeam)
                },
                teamCount: async function () {
                    return M.TeamMember.count({
                        where: {
                            UserId: this.id
                        }
                    })
                }
            }
        }
    }
}
