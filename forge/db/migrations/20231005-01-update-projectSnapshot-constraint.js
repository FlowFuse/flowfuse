/**
 * Remove not null on ProjectSnapshots.ProjectId
 */
const { DataTypes } = require('sequelize')

module.exports = {
    up: async (context) => {
        const dialect = context.sequelize.options.dialect
        if (dialect === 'sqlite') {
            // We have to do this the hard way due to limitations of sqlite and
            // changing table constraints. The changeColumn approach causes all
            // table constraints to be lost. We can keep them on the one column
            // we're modifying, but it also strips them for the others.
            await context.sequelize.query('pragma writable_schema=1;')
            const sql = "update SQLITE_MASTER set sql = replace(sql, '`ProjectId` UUID NOT NULL', '`ProjectId` UUID') where name = 'ProjectSnapshots' and type = 'table';"
            context.sequelize.query(sql)
            await context.sequelize.query('pragma writable_schema=0;')
        } else {
            // Postgres allows us to modify a constraint without breaking all
            // the other properties
            await context.changeColumn('ProjectSnapshots', 'ProjectId', {
                type: DataTypes.UUID,
                allowNull: true
            })
        }
    },
    down: async (context) => {
    }
}
