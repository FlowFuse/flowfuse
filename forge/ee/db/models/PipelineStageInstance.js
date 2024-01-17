/**
 * This is the *..* association model between an Instance (Project) and a PipelineStage
 * Sequelize does not need this model as it'll use an auto-generated one, but it allows us to configure timestamps off and meta and customise the column names
 * @namespace forge.db.models.PipelineStageInstance
 */

module.exports = {
    name: 'PipelineStageInstance',
    options: {
        timestamps: false
    },
    associations: function (M) {
        this.belongsTo(M.PipelineStage)
        this.belongsTo(M.Project, { as: 'Instance' })
    },
    meta: {
        slug: false,
        hashid: false,
        links: false
    }
}
