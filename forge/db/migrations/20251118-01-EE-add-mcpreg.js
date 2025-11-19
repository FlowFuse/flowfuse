const { DataTypes } = require('sequelize')

module.exports = {
    /**
     * upgrade database
     * @param {QueryInterface} context Sequelize.QueryInterface
     */
    up: async (context, Sequelize) => {
        await context.createTable('MCPRegistrations', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            name: {
                type: DataTypes.STRING
            },
            protocol: {
                type: DataTypes.STRING
            },
            targetType: {
                type: DataTypes.STRING,
                allowNull: false
            },
            targetId: {
                type: DataTypes.STRING,
                allowNull: false
            },
            nodeId: {
                type: DataTypes.STRING,
                allowNull: false
            },
            endpointRoute: {
                type: DataTypes.STRING,
                allowNull: false
            },
            createdAt: {
                type: DataTypes.DATE,
                allowNull: false
            },
            updatedAt: {
                type: DataTypes.DATE,
                allowNull: false
            },
            TeamId: {
                type: DataTypes.INTEGER,
                references: { model: 'Teams', key: 'id' },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE'
            }
        })

        await context.addIndex('MCPRegistrations', { name: 'mcp_team_type_unique', fields: ['targetId', 'targetType', 'nodeId', 'TeamId'], unique: true })
    },
    down: async (context, Sequelize) => { }
}
