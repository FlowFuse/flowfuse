/**
 * Add the ProjectStacks table
 */
const { DataTypes } = require('sequelize')

module.exports = {
    up: async (context) => {
        await context.createTable('ProjectStacks', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            active: { type: DataTypes.BOOLEAN, defaultValue: true },
            name: { type: DataTypes.STRING, allowNull: false },
            nodejs: { type: DataTypes.STRING, allowNull: false },
            nodered: { type: DataTypes.STRING, allowNull: false },
            memory: { type: DataTypes.STRING, allowNull: false },
            cpu: { type: DataTypes.STRING, allowNull: false },
            driverProperties: { type: DataTypes.TEXT },
            createdAt: { type: DataTypes.DATE },
            updatedAt: { type: DataTypes.DATE }
        })
        await context.addColumn('Projects', 'ProjectStackId', {
            type: DataTypes.INTEGER,
            references: { model: 'ProjectStacks', key: 'id' },
            onDelete: 'set null',
            onUpdate: 'cascade'
        })
    },
    down: async (context) => {
    }
}
