/**
 * Add MQTT Topic Schema table
 */
const { DataTypes } = require('sequelize')

module.exports = {
    /**
     * upgrade database
     * @param {QueryInterface} context Sequelize.QueryInterface
     */
    up: async (context) => {
        await context.createTable('MQTTTopicSchemas', {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            topic: { type: DataTypes.STRING },
            metadata: { type: DataTypes.TEXT },
            createdAt: { type: DataTypes.DATE },
            updatedAt: { type: DataTypes.DATE },
            BrokerCredentialsId: {
                type: DataTypes.INTEGER,
                references: { model: 'BrokerCredentials', key: 'id' },
                onDelete: 'cascade',
                onUpdate: 'cascade'
            },
            TeamId: {
                type: DataTypes.INTEGER,
                references: { model: 'Teams', key: 'id' },
                onDelete: 'cascade',
                onUpdate: 'cascade'
            }
        })
        await context.addIndex('MQTTTopicSchemas', { name: 'topic_team_broker_unique', fields: ['topic', 'TeamId', 'BrokerCredentialsId'], unique: true })
    },
    down: async (context) => {
    }
}
