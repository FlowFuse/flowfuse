/**
 * Change column type
 */

const { DataTypes } = require('sequelize')

module.exports = {
    up: async (context, Sequelize) => {
        const dialect = context.sequelize.options.dialect
        if (dialect === 'sqlite') {
            const sqlFind = "select sql from SQLITE_MASTER where name = 'Users' and type = 'table';"
            const [results] = await context.sequelize.query(sqlFind)
            if (results.length === 0) {
                return // Nothing to do
            }

            // Check if the DDL is as expected already
            const ddl = results[0].sql
            const re = /(`SSOGroups`[^,]+?VARCHAR\(255\))/.exec(ddl)
            if (!re || re.length < 2) {
                return // Nothing to do
            }

            // create new column definition
            const currentColDef = re[1]
            const newColDef = currentColDef.replace('VARCHAR(255)', 'TEXT')

            // update the table with the new column definition
            await context.sequelize.query('pragma writable_schema=1;')
            const sqlUpdate = `update SQLITE_MASTER set sql = replace(sql, '${currentColDef}', '${newColDef}') where name = 'Users' and type = 'table';`
            context.sequelize.query(sqlUpdate)
            await context.sequelize.query('pragma writable_schema=0;')
        } else {
            // This will trigger the User delete actions on SQLITE
            await context.changeColumn('Users', 'SSOGroups', {
                type: DataTypes.TEXT,
                allowNull: true
            })
        }
    },
    down: async (useContext, Sequelize) => {
    }
}
