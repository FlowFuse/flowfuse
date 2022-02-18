/**
 * A Project Stack definition
 * @namespace forge.db.models.ProjectStack
 */
const { DataTypes } = require('sequelize')

module.exports = {
    name: 'ProjectStack',
    schema: {
        name: { type: DataTypes.STRING, allowNull: false },
        active: { type: DataTypes.BOOLEAN, defaultValue: true },
        nodejs: { type: DataTypes.STRING, allowNull: false },
        nodered: { type: DataTypes.STRING, allowNull: false },
        memory: { type: DataTypes.STRING, allowNull: false },
        cpu: { type: DataTypes.STRING, allowNull: false },
        driverProperties: {
            type: DataTypes.TEXT,
            set (value) {
                this.setDataValue('driverProperties', JSON.stringify(value))
            },
            get () {
                const rawValue = this.getDataValue('driverProperties') || '{}'
                return JSON.parse(rawValue)
            }

        }
    },
    associations: function (M) {
        this.hasMany(M.Project)
    }
}
