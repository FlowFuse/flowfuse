/* eslint-disable no-unused-vars */
/**
 * Add DeviceGroups table that has an FK association with Applications and Devices
 */

const { Sequelize, QueryInterface } = require('sequelize')

module.exports = {
    /**
     * upgrade database
     * @param {QueryInterface} context QueryInterface
     */
    up: async (context) => {
        await context.createTable('DeviceGroups', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            name: {
                type: Sequelize.STRING(255),
                allowNull: false
            },
            description: {
                type: Sequelize.TEXT
            },
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE
            },
            ApplicationId: {
                type: Sequelize.INTEGER,
                references: {
                    model: 'Applications',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            }
        })

        // add a column to Devices table that references DeviceGroups
        await context.addColumn('Devices', 'DeviceGroupId', {
            type: Sequelize.INTEGER,
            references: {
                model: 'DeviceGroups',
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
        })
    },

    down: async (queryInterface, Sequelize) => {

    }
}
