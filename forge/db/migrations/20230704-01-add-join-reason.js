/**
 * Adds the "join-reason" column introduced to the sign up form
 * Is configurable in the admin panel, and so could be null and never used in an FF instance
 */
const { DataTypes } = require('sequelize')

module.exports = {
    up: async (context) => {
        context.addColumn('Users', 'join_reason', {
            type: DataTypes.STRING,
            allowNull: true
        })
    },
    down: async (context) => {
    }
}
