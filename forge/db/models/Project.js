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
        slug: { type: DataTypes.VIRTUAL, get() { return this.id }}
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
                byTeam: async (team) => {
                    return this.findAll({
                        include: {
                            model: M['Team'],
                            where: { slug: team },
                            attributes:["id","name","slug","links"]
                        }
                    })
                }
            }
        }
    }
}
