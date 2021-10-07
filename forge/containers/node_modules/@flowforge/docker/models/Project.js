/**
 * A Project
 * @namespace forge.db.models.docker.DockerProject
 */
const { DataTypes, Model } = require('sequelize');

const M = {}

module.exports = function(db) {

    var model = db.sequelize.define('DockerProject',{
        id: { type: DataTypes.UUID, primaryKey: true},
        url: { type: DataTypes.STRING, allowNull: false},
        state: { type: DataTypes.STRING, allowNull: false },
        type: { type: DataTypes.STRING, allowNull: false, defaultValue: 'basic'},
        options: {type: DataTypes.STRING, allowNull: false, defaultValue: '{}'}
    },{
    })

    let finders = function(M) {
        return { static: {
            byId: async (id) => {
                return this.findOne({
                    where: {
                        id: id
                    }
                })
            }
        }}
    }

    let stats = finders.call(model, M)

    Object.assign(model, stats.static)

    db.models.DockerProject = model

    model.sync({ alter: true })
}
