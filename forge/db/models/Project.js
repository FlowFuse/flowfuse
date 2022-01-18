/**
 * A Project
 * @namespace forge.db.models.Project
 */
const { DataTypes } = require('sequelize');

const Controllers = require('../controllers');

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
                    self: process.env.FLOWFORGE_BASE_URL+"/api/v1/projects/"+this.id
                }
            }
        },
        storageURL: { type: DataTypes.VIRTUAL, get() { return process.env.FLOWFORGE_API_URL + "/storage" }},
        auditURL: { type: DataTypes.VIRTUAL, get() { return process.env.FLOWFORGE_API_URL + "/logging" }},
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
        this.hasOne(M['AccessToken'], {
            foreignKey: 'ownerId',
            constraints: false,
            scope: {
                ownerType: 'project'
            }
        })
        this.hasMany(M['ProjectSettings'])
    },
    hooks: function(M) {
        return {
            afterDestroy: async (project, opts) => {
                await M['AccessToken'].destroy({
                    where: {
                        ownerType: "project",
                        ownerId: project.id
                    }
                })
                await M['AuthClient'].destroy({
                    where: {
                        ownerType: "project",
                        ownerId: project.id
                    }
                })
                await M['ProjectSettings'].destroy({
                    where: {
                        ProjectId: project.id
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
            instance: {
                async refreshAuthTokens() {
                    const authClient = await Controllers.AuthClient.createClientForProject(this);
                    const projectToken = await Controllers.AccessToken.createTokenForProject(this, null, ["project:flows:view","project:flows:edit"])
                    return {
                        token: projectToken.token,
                        ...authClient
                    }
                },
                async getAllSettings() {
                    const result = {};
                    const settings = await this.getProjectSettings();
                    settings.forEach(setting => {
                        result[setting.key] = setting.value;
                    })
                    return result
                },
                async updateSettings(obj) {
                    const updates = []
                    for ([key,value] of Object.entries(obj)) {
                        updates.push({ProjectId: this.id,key,value})
                    }
                    await M['ProjectSettings'].bulkCreate(updates,{ updateOnDuplicate: ['value'] })
                },
                async updateSetting(key, value) {
                    return await M['ProjectSettings'].upsert({ ProjectId: this.id, key, value });
                },
                async getSetting(key) {
                    const result = await M['ProjectSettings'].findOne({ where:{ ProjectId: this.id, key }});
                    if (result) {
                        return result.value;
                    }
                    return undefined
                },
            },
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
