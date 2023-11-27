/**
 * This is the *..* association between a Device and a PipelineStage
 * Sequelize does not need this model as it'll use an auto-generated one, but it allows us to configure timestamps off and meta
 * @namespace forge.db.models.PipelineStageDevice
 */

module.exports = {
    name: 'PipelineStageDevice',
    options: {
        timestamps: false
    },
    associations: function (M) {
        this.belongsTo(M.PipelineStage)
        this.belongsTo(M.Device)
    },
    meta: {
        slug: false,
        hashid: false,
        links: false
    }
}
