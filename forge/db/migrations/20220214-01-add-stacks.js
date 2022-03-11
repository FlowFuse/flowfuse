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
            name: { type: DataTypes.STRING, allowNull: false, unique: true },
            properties: { type: DataTypes.TEXT },
            createdAt: { type: DataTypes.DATE },
            updatedAt: { type: DataTypes.DATE }
        })
        await context.addColumn('Projects', 'ProjectStackId', {
            type: DataTypes.INTEGER,
            references: { model: 'ProjectStacks', key: 'id' },
            onDelete: 'set null',
            onUpdate: 'cascade'
        })
        // We cannot safely remove columns when using sqlite as it triggers
        // 'on delete cascade' events that wipes the ProjectSettings table
        // https://stackoverflow.com/a/70486686/2117239
        // Possible workaround is to wrap this with a modification to the
        // other tables to remove the `on delete cascade` constraint - and
        // then restore it afterwards.
        // await context.removeColumn('Projects', 'type')
    },
    down: async (context) => {
    }
}
