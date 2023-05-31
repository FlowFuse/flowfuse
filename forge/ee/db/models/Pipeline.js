const {
    DataTypes
} = require('sequelize')

module.exports = {
    name: 'Pipeline',
    schema: {
        name: {
            type: DataTypes.STRING,
            allowNull: false
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
