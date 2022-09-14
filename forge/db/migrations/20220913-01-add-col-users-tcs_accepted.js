/**
 * Add column 'tcs_accepted' in Projects 'Users'
 */
const { DataTypes } = require('sequelize')

module.exports = {
    /**
     * upgrade database
     * @param {import('sequelize').QueryInterface} context Sequelize.QueryInterface
     */
    up: async (context) => {
        await context.addColumn('Users', 'tcs_accepted', {
            type: DataTypes.DATE,
            allowNull: true
        })
    },
    down: async (context) => {
    }
}
