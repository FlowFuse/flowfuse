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
                    const where = {
                        TeamId: team
                    }
                    if (type) {
                        where.type = type
                    }
                    return this.findAll({ where })
                },
                byName: async (team, type, name) => {
                    const where = {
                        name,
                        TeamId: team
                    }
                    if (type) {
                        where.type = type
                    }
                    return this.findOne({ where })
                },
                byPath: async (team, type, name) => {
                    const where = {
                        TeamId: team,
                        name: {
                            [Op.like]: `${name}%`
                        }
                    }
                    if (type) {
                        where.type = type
                    }
                    return this.findAll({ where })
                }
            }
        }
    }
}
