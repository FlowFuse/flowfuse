/* eslint-disable no-unused-vars */

/*
 * Add FK relation between Device and ProjectSnapshot
 */

const { DataTypes, QueryInterface } = require('sequelize')

module.exports = {
    /**
     * upgrade database
     * @param {QueryInterface} context Sequelize.QueryInterface
     */
    up: async (context) => {
        await context.addColumn('ProjectSnapshots', 'DeviceId', {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'Devices', key: 'id' },
            onDelete: 'SET NULL',
            onUpdate: 'CASCADE'
        })
    },
    down: async (context) => {
    }
}
