const {
    DataTypes
} = require('sequelize')

module.exports = {
    name: 'Pipeline',
    schema: {
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notNull: {
                    msg: 'Name is required'
                },
                notEmpty: {
                    msg: 'Name must not be blank'
                }
            }
        }
    },
    associations: function (M) {
        this.belongsTo(M.Application)
        this.hasMany(M.PipelineStage)
    },
    finders: function (M) {
        const self = this
        return {
            instance: {
                stages: async function () {
                    return await M.PipelineStage.byPipeline(this.id)
                },
                hasInstance: async function (instance) {
                    return await M.PipelineStage.count({
                        where: {
                            PipelineId: this.id
                        },
                        limit: 1,
                        include: [
                            {
                                association: 'Instances',
                                where: {
                                    id: instance.id
                                }
                            }
                        ]
                    }) > 0
                },
                hasDevice: async function (device) {
                    return await M.PipelineStage.count({
                        where: {
                            PipelineId: this.id
                        },
                        limit: 1,
                        include: [
                            {
                                association: 'Devices',
                                where: {
                                    id: device.id
                                }
                            }
                        ]
                    }) > 0
                }
            },
            static: {
                byId: async function (idOrHash) {
                    let id = idOrHash
                    if (typeof idOrHash === 'string') {
                        id = M.Pipeline.decodeHashid(idOrHash)
                    }
                    return this.findOne({
                        where: { id }
                    })
                },
                byApplicationId: async function (applicationId) {
                    if (typeof applicationId === 'string') {
                        applicationId = M.Application.decodeHashid(applicationId)
                    }
                    return self.findAll({
                        where: {
                            ApplicationId: applicationId
                        }
                    })
                }
            }
        }
    }
}
