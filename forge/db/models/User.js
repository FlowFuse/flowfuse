/**
 * A User
 * @namespace forge.db.models.User
 */
const { DataTypes } = require('sequelize');
const bcrypt = require("bcrypt");

function hash(value) {
    return bcrypt.hashSync(value, 10);
}

module.exports = {
    name: 'User',
    schema: {
        name: { type: DataTypes.STRING, allowNull: false },
        email: { type: DataTypes.STRING, allowNull: false, unique: true},
        password: {
            type: DataTypes.STRING,
            set(value) {
                this.setDataValue('password', hash(value));
            }
        },
        admin: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        avatar: {type: DataTypes.STRING }
    },
    scopes: {
        admins: { where: { admin: true }}
    },
    hooks: {
        beforeCreate: (user, options) => {
            if (!user.avatar) {
                const cleanEmail = user.email.trim().toLowerCase();
                const emailHash = require("crypto").createHash('md5').update(cleanEmail).digest("hex")
                user.avatar = `//www.gravatar.com/avatar/${emailHash}?d=identicon` //retro mp
            }
        }
    },
    associations: function(M) {
        this.belongsToMany(M['Team'], { through: M['TeamMember']})
        this.hasMany(M['TeamMember']);
        this.hasMany(M['Session']);
    },
    finders: function(M) {
        return {
            static: {
                admins: async () => {
                    return this.scope('admins').findAll();
                },
                byEmail: async (email) => {
                    return this.findOne({where:{email},
                        include: {
                            model: M['Team'],
                            attributes: ['name'],
                            through: {
                                attributes:['role']
                            }
                        }
                    })
                },
                byName: async (name) => {
                    return this.findOne({where:{name},
                        include: {
                            model: M['Team'],
                            attributes: ['name'],
                            through: {
                                attributes:['role']
                            }
                        }
                    })
                },
                // inTeam: async (name) => {
                //     return M['User'].findAll({
                //         include: {
                //             model: M['Team'],
                //             attributes: ['name'],
                //             where: {name},
                //             through: {
                //                 attributes:['role']
                //             }
                //         }
                //     })
                // }
            },
            instance: {
                // get the team membership for the given team
                // `teamId` can be either a number (the raw id) or a string (the hashid).
                // TODO: standardize on using hashids externally
                getTeamMembership: async function(teamId) {
                    if (typeof teamId === 'string') {
                        teamId = M['Team'].decodeHashid(teamId);
                    }
                    const memberships = await this.getTeamMembers({
                        where: {
                            TeamId: teamId
                        },
                        include: {
                            model:M['Team']
                        }
                    });
                    return memberships[0]
                }
            }
        }
    }
}
