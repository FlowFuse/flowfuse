/**
 * Remove NOT NULL on ProjectSnapshots.UserId
 */
// eslint-disable-next-line no-unused-vars
const { DataTypes, QueryInterface } = require('sequelize')

module.exports = {
    /**
     * @param {QueryInterface} context Sequelize.QueryInterface
     */
    up: async (context) => {
        const dialect = context.sequelize.options.dialect
        if (dialect === 'sqlite') {
            // We have to do this the hard way due to limitations of sqlite and
            // changing table constraints. The changeColumn approach causes all
            // table constraints to be lost. We can keep them on the one column
            // we're modifying, but it also strips them for the others.

            // get the current DDL for the ProjectSnapshots table
            const sqlFind = "select sql from SQLITE_MASTER where name = 'ProjectSnapshots' and type = 'table';"
            const [results] = await context.sequelize.query(sqlFind)
            if (results.length === 0) {
                return // Nothing to do
            }

            // check if the UserId column has a NOT NULL constraint
            const ddl = results[0].sql
            const re = /(UserId[^,]+?NOT NULL)/.exec(ddl)
            if (!re || re.length < 2) {
                return // Nothing to do
            }

            // remove NOT NULL from the UserId column definition
            const currentColDef = re[1]
            const newColDef = currentColDef.replace('NOT NULL', '')

            // update the table with the new column definition
            await context.sequelize.query('pragma writable_schema=1;')
            const sqlUpdate = `update SQLITE_MASTER set sql = replace(sql, '${currentColDef}', '${newColDef}') where name = 'ProjectSnapshots' and type = 'table';`
            context.sequelize.query(sqlUpdate)
            await context.sequelize.query('pragma writable_schema=0;')
        } else {
            // Postgres allows us to modify a constraint without breaking other properties
            // set the column to match the exact same definition in the rollup migration 20231005-01-update-projectSnapshot-constraint.js
            await context.changeColumn('ProjectSnapshots', 'UserId', {
                type: DataTypes.INTEGER,
                allowNull: true,
                defaultValue: null
            })
        }
    },
    down: async (context) => {
    }
}
