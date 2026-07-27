const { DataTypes } = require('sequelize')

module.exports = {
    /**
     * upgrade database
     * @param {QueryInterface} context Sequelize.QueryInterface
     */
    up: async (context, Sequelize) => {
        await context.createTable('AsyncLoginSessions', {
            sessionToken: {
                type: DataTypes.STRING,
                primaryKey: true
            },
            doneToken: {
                type: DataTypes.STRING
            },
            status: {
                type: DataTypes.STRING,
                defaultValue: 'pending'
            },
            result: {
                type: DataTypes.TEXT
            },
            createdAt: {
                type: DataTypes.DATE,
                allowNull: false
            },
            updatedAt: {
                type: DataTypes.DATE,
                allowNull: false
            }
        })
        await context.addIndex('AsyncLoginSessions', { name: 'async_login_sessions_done_token', fields: ['doneToken'] })
    },
    down: async (context, Sequelize) => { }
}
