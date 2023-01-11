/**
 * A Team's Shared Library
 * @namespace forge.db.models.StorageSharedLibrary
 */
const { DataTypes, Op } = require('sequelize')

module.exports = {
    name: 'StorageSharedLibrary',
    schema: {
        name: { type: DataTypes.TEXT, allowNull: false },
        type: { type: DataTypes.TEXT, allowNull: false },
        meta: { type: DataTypes.TEXT, allowNull: true },
        body: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' }
    },
    associations: function (M) {
        this.belongsTo(M.Team, {
            onDelete: 'CASCADE'
        })
    },
    finders: function (M) {
        return {
            static: {
                byTeam: async (team) => {
                    return this.findAll({
                        include: {
                            model: M.Team,
                            where: { team },
                            attributes: ['type', 'meta', 'body']
                        }
                    })
                },
                byType: async (team, type) => {
                    return this.findAll({
                        where: { TeamId: team, type }
                    })
                },
                byName: async (team, type, name) => {
                    return this.findOne({
                        where: { TeamId: team, type, name }
                    })
                },
                byPath: async (team, type, name) => {
                    return this.findAll({
                        where: {
                            TeamId: team,
                            type,
                            name: {
                                [Op.like]: `${name}%`
                            }
                        }
                    })
                }
            }
        }
    }
}
