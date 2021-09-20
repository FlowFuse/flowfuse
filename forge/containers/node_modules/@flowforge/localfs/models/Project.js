/**
 * A Project
 * @namespace forge.db.models.localfs.LocalFSProject
 */
const { DataTypes, Model } = require('sequelize');

const M = {}

module.exports = function(db) {

    var model = db.sequelize.define('LocalFSProject',{
        id: { type: DataTypes.UUID, primaryKey: true},
        pid: { type: DataTypes.STRING, allowNull: false},
        path: { type: DataTypes.STRING, allowNull: false},
        port: { type: DataTypes.INTEGER, allowNull: false},
        state: { type: DataTypes.STRING, allowNull: false },
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

    db.models.LocalFSProject = model

    model.sync({ alter: true })
}
