/**
 * Add inferred Payload schema to topics
 */
const { DataTypes } = require('sequelize')

module.exports = {
    /**
     * upgrade database
     * @param {QueryInterface} context Sequelize.QueryInterface
     */
    up: async (context) => {
        await context.addColumn('MQTTTopicSchemas', 'inferredSchema', {
            type: DataTypes.TEXT,
            defaultValue: null
        })
    },
    down: async (context) => {
    }
}