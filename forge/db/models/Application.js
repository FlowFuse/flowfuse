/**
 * An application definition
 * @namespace forge.db.models.Application
 */
const { DataTypes } = require('sequelize')

module.exports = {
    name: 'Application',
    schema: {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: { type: DataTypes.STRING, allowNull: false }
    },
    associations: function (M) {
        this.hasMany(M.Project)
        this.belongsTo(M.Team)
    },
    finders: function (M) {
        return {
            static: {
                byId: async function (idOrHash) {
                    let id = idOrHash
                    if (typeof idOrHash === 'string') {
                        id = M.Application.decodeHashid(idOrHash)
                    }
                    return this.findOne({
                        where: { id },
                        include: [
                            {
                                model: M.Team,
                                attributes: ['hashid', 'id', 'name', 'slug', 'links']
                            }
                        ]
                    })
                },
                byTeam: async (teamIdOrHash) => {
                    let id = teamIdOrHash
                    if (typeof teamIdOrHash === 'string') {
                        id = M.Team.decodeHashid(teamIdOrHash)
                    }
                    return this.findAll({
                        include: [
                            {
                                model: M.Team,
                                attributes: ['hashid', 'id', 'name', 'slug', 'links'],
                                where: { id }
                            }
                        ]
                    })
                }
            },
            instance: {
                projectCount: async function () {
                    return await M.Project.count({
                        where: { ApplicationId: this.id }
                    })
                }
            }
        }
    }
}
