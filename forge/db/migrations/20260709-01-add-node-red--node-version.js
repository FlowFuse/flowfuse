const { DataTypes } = require('sequelize')

module.exports = {
    /**
     * upgrade database
     * @param {QueryInterface} context Sequelize.QueryInterface
     */
    up: async (context, Sequelize) => {
        await context.createTable('NodeREDNodeVersions', {
            ownerId: {
                type: DataTypes.STRING,
                allowNull: false
            },
            ownerType: {
                type: DataTypes.STRING,
                allowNull: false
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false
            },
            currentVersion: {
                type: DataTypes.STRING,
                allowNull: false
            },
            latestVestion: {
                types: DataTypes.STRING,
                allowNull: true
            }
        })

        await context.addIndex('NodeREDNodeVersions', {
            
        })
    },
    down: async (context) => {}
}