/**
 * This is the *..* association between a DeviceGroup and a PipelineStage
 * Sequelize does not need this model as it'll use an auto-generated one, but it allows us to configure timestamps off and meta
 * @namespace forge.db.models.PipelineStageDevice
 */

module.exports = {
    name: 'PipelineStageDeviceGroup',
    options: {
        timestamps: false
    },
    associations: function (M) {
        this.belongsTo(M.PipelineStage)
        this.belongsTo(M.DeviceGroup)
        this.belongsTo(M.ProjectSnapshot, { as: 'targetSnapshot' })
    },
    meta: {
        slug: false,
        hashid: false,
        links: false
    },
    finders: function (M) {
        return {
            static: {
                byId: async function (idOrHash) {
                    let id = idOrHash
                    if (typeof idOrHash === 'string') {
                        id = M.PipelineStageDeviceGroup.decodeHashid(idOrHash)
                    }
                    return this.findOne({
                        where: { PipelineStageId: id },
                        include: [
                            {
                                model: M.DeviceGroup,
                                attributes: ['hashid', 'id', 'name', 'description', 'ApplicationId', 'activePipelineStageId']
                            },
                            {
                                model: M.PipelineStage,
                                attributes: ['hashid', 'id', 'name', 'action', 'NextStageId', 'PipelineId']
                            },
                            { model: M.ProjectSnapshot, as: 'targetSnapshot', attributes: ['id', 'hashid', 'name'] }
                        ]
                    })
                }
            }
        }
    }
}
