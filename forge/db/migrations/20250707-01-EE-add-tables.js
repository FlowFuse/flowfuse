/**
 * Add FF Tables table
 */
const { DataTypes } = require('sequelize')

module.exports = {
    up: async (context) => {
        await context.createTable('Tables', {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            name: {
                type: DataTypes.STRING,
                allowNull: false
            },
            credentials: {
                type: DataTypes.TEXT,
                set (value) {
                    this.setDataValue('credentials', JSON.stringify(value))
                },
                get () {
                    const rawValue = this.getDataValue('credentials') || '{}'
                    return JSON.parse(rawValue)
                }
            },
            meta: {
                type: DataTypes.TEXT,
                set (value) {
                    this.setDataValue('meta', JSON.stringify(value))
                },
                get () {
                    const rawValue = this.getDataValue('meta') || '{}'
                    return JSON.parse(rawValue)
                }
            },
            createdAt: { type: DataTypes.DATE, allowNull: false },
            updatedAt: { type: DataTypes.DATE, allowNull: false },
            TeamId: {
                type: DataTypes.INTEGER,
                references: { model: 'Teams', key: 'id' },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE'
            }
        })
    },
    down: async (context) => {}
}
