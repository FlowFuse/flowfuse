/**
 * Add ProjectSnapshots table
 */
const { DataTypes } = require('sequelize')

module.exports = {
    up: async (context) => {
        await context.addColumn('Devices', 'activeSnapshotId', {
            type: DataTypes.INTEGER,
            references: { model: 'ProjectSnapshots', key: 'id' },
            onDelete: 'set null',
            onUpdate: 'cascade'
        })
        await context.addColumn('Devices', 'targetSnapshotId', {
            type: DataTypes.INTEGER,
            references: { model: 'ProjectSnapshots', key: 'id' },
            onDelete: 'set null',
            onUpdate: 'cascade'
        })
    },
    down: async (context) => {
    }
}
