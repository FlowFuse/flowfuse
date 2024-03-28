/* eslint-disable no-unused-vars */

/**
 * Add credentialSecret to Snapshots table
 */
const { DataTypes } = require('sequelize')

module.exports = {
    /**
     * upgrade database
     * @param {QueryInterface} context Sequelize.QueryInterface
     */
    up: async (context) => {
        await context.addColumn('ProjectSnapshots', 'credentialSecret', {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: ''
        })
        context.sequelize.query(`
            update "ProjectSnapshots"
              set "credentialSecret" = "ProjectSettings"."value"
              from "ProjectSettings"
              where 
                "ProjectSettings"."ProjectId" = "ProjectSnapshots"."ProjectId" and
                "ProjectSettings"."key" = 'credentialSecret'
        `)
        context.sequelize.query(`
            update "ProjectSnapshots"
              set "credentialSecret" = "Devices"."credentialSecret"
              from "Devices"
              where "Devices".id = "ProjectSnapshots"."DeviceId"
        `)
    },
    down: async (context) => {
    }
}
