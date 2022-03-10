/**
 * This adds a unique constraint to the Project name column
 */
const { DataTypes } = require('sequelize')

module.exports = {
    up: async (context) => {
        context.changeColumn('Project', 'name', {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            defaultValue: false,
            get () {
                const raw = this.getDataValue('name')
                return raw ? this.name.toLowerCase() : null
            },
            set (value) {
                this.setDataValue('name', value.toLowerCase())
            }
        })
    },
    down: async (context) => {
        context.changeColumn('Project', 'name', {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: false
        })
    }
}
