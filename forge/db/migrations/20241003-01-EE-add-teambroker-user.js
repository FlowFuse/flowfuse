/* eslint-disable no-unused-vars */
/**
 * Add TeamBrokerUser
 */

const { DataTypes, QueryInterface } = require('sequelize')

module.exports = {
    /**
     * @param {QueryInterface} context Sequelize.QueryInterface
     */
    up: async (context) => {
        await context.createTable('TeamBrokerUsers', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            username: { type: DataTypes.STRING, allowNull: false },
            password: {
                type: DataTypes.STRING,
                set (value) {
                    this.setDataValue('password', hash(value))
                }
            },
            acls: { type: DataTypes.STRING, defaultValue: '#' },
            createdAt: { type: DataTypes.DATE },
            updatedAt: { type: DataTypes.DATE },
            TeamId: {
                type: DataTypes.INTEGER,
                references: { model: 'Teams', key: 'id' },
                onDelete: 'cascade',
                onUpdate: 'cascade'
            }
        })
        await context.addIndex('TeamBrokerUsers', { name: 'broker_users_team_unique', fields: ['username','TeamId'], unique: true })
    },
    down: async (context) => {
    }
}