/**
 * This is the many:1 association model between a Project and a PipelineStage
 * @namespace forge.db.models.PipelineStageInstance
 */

module.exports = {
    name: 'PipelineStageInstance',
    options: {
        timestamps: false
    },
    associations: function (M) {
        this.belongsTo(M.PipelineStage)
        this.belongsTo(M.Project, { as: 'Instance' }) // @TODO: need to guard that the instance is part of the same application that owns the stage
    },
    meta: {
        slug: false,
        hashid: false,
        links: false
    }
}
