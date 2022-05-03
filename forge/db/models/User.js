/**
 * A User
 * @namespace forge.db.models.User
 */
const { DataTypes, Op } = require('sequelize')
const { hash, generateUserAvatar } = require('../utils')

module.exports = {
    name: 'User',
    schema: {
        username: { type: DataTypes.STRING, allowNull: false, unique: true },
        name: { type: DataTypes.STRING },
        email: { type: DataTypes.STRING, unique: true, validate: { isEmail: true } },
        email_verified: { type: DataTypes.BOOLEAN, defaultValue: false },
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
        }
    },
    scopes: {
        admins: { where: { admin: true } }
    },
    hooks: {
        beforeCreate: (user, options) => {
            if (!user.avatar) {
                user.avatar = generateUserAvatar(user.name || user.username)
            }
            if (!user.name) {
                user.name = user.username
            }
        },
        beforeUpdate: (user) => {
            if (user.avatar.startsWith(`${process.env.FLOWFORGE_BASE_URL}/avatar/`)) {
                user.avatar = generateUserAvatar(user.name || user.username)
            }
        },
        beforeDestroy: async (user, opts) => {
            const teamCount = await user.getTeamMembership
            console.log(teamCount)
            // is user an admin? find user in the admin list
            // const userIsAdmin = findUserInAdminList(admins, user)
            // if yes, is admin count == 1?
            // if (userIsAdmin && admins.length <= 1) {
            throw new Error('Cannot delete team owner.')

            // }
            // Check if user is only owner of a team
            // 1.) get teams associated with this user.
            // 2.) Check owner count of each team, if ANY of teams Owner count == 1, DO NOT DELETE user.
        },
        afterDestroy: async (user, opts) => {
            // TODO: what needs tidying up after a user is deleted?
            // Need to delete all user sessions, invitations, ARE These assocations deleted automatically on calling user.destroy()?????
            // StorageSessions - What to do?? This is for any active Node Red Instance editor sessions for current user
        }
    },
    associations: function (M) {
        this.belongsToMany(M.Team, { through: M.TeamMember })
        this.hasMany(M.TeamMember)
        this.hasMany(M.Session)
        this.hasMany(M.Invitation, { foreignKey: 'invitorId' })
        this.hasMany(M.Invitation, { foreignKey: 'inviteeId' })
    },
    finders: function (M) {
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
                                attributes: ['role']
                            }
                        }
                    })
                },
                byUsername: async (username) => {
                    return this.findOne({
                        where: { username },
                        include: {
                            model: M.Team,
                            attributes: ['name'],
                            through: {
                                attributes: ['role']
                            }
                        }
                    })
                },
                byEmail: async (email) => {
                    return this.findOne({
                        where: { email },
                        include: {
                            model: M.Team,
                            attributes: ['name'],
                            through: {
                                attributes: ['role']
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
                                attributes: ['role']
                            }
                        }
                    })
                },
                byUsernameOrEmail: async (name) => {
                    return this.findOne({
                        where: {
                            [Op.or]: [{ username: name }, { email: name }]
                        },
                        include: {
                            model: M.Team,
                            attributes: ['name'],
                            through: {
                                attributes: ['role']
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
                                attributes: ['role']
                            }
                        }
                    })
                },
                getAll: async (pagination = {}) => {
                    const limit = parseInt(pagination.limit) || 30
                    const where = {}
                    if (pagination.cursor) {
                        where.id = { [Op.gt]: M.User.decodeHashid(pagination.cursor) }
                    }
                    const { count, rows } = await this.findAndCountAll({
                        where,
                        order: [['id', 'ASC']],
                        limit
                    })
                    return {
                        meta: {
                            next_cursor: rows.length === limit ? rows[rows.length - 1].hashid : undefined
                        },
                        count,
                        users: rows
                    }
                }
            },
            instance: {
                // get the team membership for the given team
                // `teamId` can be either a number (the raw id) or a string (the hashid).
                // TODO: standardize on using hashids externally
                getTeamMembership: async function (teamId, includeTeam) {
                    return M.TeamMember.getTeamMembership(this.id, teamId, includeTeam)
                }
            }
        }
    }
}
