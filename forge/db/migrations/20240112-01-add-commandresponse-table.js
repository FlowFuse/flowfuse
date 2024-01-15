/* eslint-disable no-unused-vars */

const { DataTypes, QueryInterface } = require('sequelize')

module.exports = {
    up: async (context) => {
        // This migration was added by https://github.com/FlowFuse/flowfuse/pull/3331
        // Before this was released we identified an alternative solution that
        // does not require a db table.
        // This migration file has been kept so that anyone who picked up the previous
        // change will not be impacted, however we no longer need to create the table
    },
    down: async (context) => {
    }
}
