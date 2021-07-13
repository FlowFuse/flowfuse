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
        url: { type: DataTypes.STRING, allowNull: false}
    },
    associations: function(M) {
        this.belongsTo(M['Team'])
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
                        where:{
                            id: id
                        }
                    })
                }
            }
        }
    }
}
