/**
 * A Project
 * @namespace forge.db.models.Project
 */
const { DataTypes } = require('sequelize');

module.exports = {
    name: 'Project',
    schema: {
        id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4},
        name: { type: DataTypes.STRING, allowNull: false},
        type: { type: DataTypes.STRING, allowNull: false},
        url: { type: DataTypes.STRING, allowNull: false},
        slug: { type: DataTypes.VIRTUAL, get() { return this.id }},
        state: { type: DataTypes.STRING, allowNull: false, defaultValue: "running"},
        links: {
            type: DataTypes.VIRTUAL,
            get() {
                return {
                    self: process.env.BASE_URL+"/api/v1/projects/"+this.id
                }
            }
        }
    },
    associations: function(M) {
        this.belongsTo(M['Team'])
        this.hasOne(M['AuthClient'], {
            foreignKey: 'ownerId',
            constraints: false,
            scope: {
                ownerType: 'project'
            }
        })
    },
    hooks: function(M) {
        return {
            afterDestroy: async (project, opts) => {
                await M['AuthClient'].destroy({
                    where: {
                        ownerType: "project",
                        ownerId: project.id
                    }
                })
                await M['StorageLibrary'].destroy({
                    where: {
                        ProjectId: project.id
                    }
                })
                await M['StorageSettings'].destroy({
                    where: {
                        ProjectId: project.id
                    }
                })
                await M['StorageSession'].destroy({
                    where: {
                        ProjectId: project.id
                    }
                })
                await M['StorageCredentials'].destroy({
                    where: {
                        ProjectId: project.id
                    }
                })
                await M['StorageFlow'].destroy({
                    where: {
                        ProjectId: project.id
                    }
                })
            }
        }
    },
    finders: function(M){
        return {
            static: {
                byUser: async (user) => {
                    return this.findAll({
                        include: {
                            model: M['Team'],
                            include: {
                                model: M['TeamMember'],
                                where: {
                                    UserId: user.id
                                }
                            },
                            required: true
                        }
                    })
                },
                byId: async (id) => {
                    return this.findOne({
                        where: { id: id },
                        include: {
                            model: M['Team'],
                            attributes:["id","name","slug","links"]
                        }
                    })
                },
                byTeam: async (teamHashId) => {
                    const teamId = M['Team'].decodeHashid(teamHashId);
                    return this.findAll({
                        include: {
                            model: M['Team'],
                            where: { id: teamId },
                            attributes:["id","name","slug","links"]
                        }
                    })
                }
            }
        }
    }
}
