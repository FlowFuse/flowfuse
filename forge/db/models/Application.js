/**
 * An application definition
 * @namespace forge.db.models.Application
 */
const { DataTypes } = require('sequelize')

module.exports = {
    name: 'Application',
    schema: {
        name: { type: DataTypes.STRING, allowNull: false }
    },
    associations: function (M) {
        this.hasMany(M.Project)
        this.hasMany(M.Project, { as: 'Instances' })
        this.belongsTo(M.Team, { foreignKey: { allowNull: false } })
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
                byTeam: async (teamIdOrHash, { includeInstances = false }) => {
                    let id = teamIdOrHash
                    if (typeof teamIdOrHash === 'string') {
                        id = M.Team.decodeHashid(teamIdOrHash)
                    }

                    const includes = [
                        {
                            model: M.Team,
                            attributes: ['hashid', 'id', 'name', 'slug', 'links'],
                            where: { id }
                        }
                    ]

                    if (includeInstances) {
                        includes.push({
                            model: M.Project,
                            as: 'Instances',
                            attributes: ['hashid', 'id', 'name', 'slug', 'links']
                        })
                    }

                    return this.findAll({
                        include: includes
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
