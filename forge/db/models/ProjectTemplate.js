/**
 * A Project Stack definition
 * @namespace forge.db.models.ProjectTemplate
 */
const { DataTypes } = require('sequelize')

module.exports = {
    name: 'ProjectTemplate',
    schema: {
        name: { type: DataTypes.STRING, allowNull: false, unique: true },
        settings: {
            type: DataTypes.TEXT,
            set (value) {
                this.setDataValue('settings', JSON.stringify(value))
            },
            get () {
                const rawValue = this.getDataValue('settings') || '{}'
                return JSON.parse(rawValue)
            }
        }
    },
    associations: function (M) {
        this.hasMany(M.Project)
        this.hasMany(this, { as: 'children', foreignKey: 'ParentId' })
        this.belongsTo(this, { as: 'parent', foreignKey: 'ParentId' })
    }
}
