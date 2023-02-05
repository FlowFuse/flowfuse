/* eslint-disable no-unused-vars */

/**
 * Add `id` to stack
 *
 * NOTES:
 * Since the original table had the `token` column as the primary key, the `id` was not auto created by sequelize
 *  meaning that in order to do CRUD on the AccessTokens without exposing the token, it was necessary to
 *  an an `id` column.
 * However, simply adding an Auto Increment `id` column was not possible since the table has existing rows and
 *  the new `id`s would be generated with null value (this is not an issue itself) but the auto increment
 *  simply did not auto insert a value upon creation of a new row.
 *
 * Now because SQLite does not support all operations of modifying columns in a table,
 *  the only working solution here was to create a duplicate of the AccessTokens table complete
 *  with the new `id` field, copy the data over, drop the original table and finally rename the duplicate.
 *
 * Additionally, the `id` column is added as the primary key, as this is the only way to do auto
 *  increment `id` in SQLite. (simply setting `autoIncrement` to true did not work)
 *
 * Since the new `id` column is now the primary key, the `token` column is no longer the primary key, and
 *  therefore is set to have a `unique` index. For these reasons, a transaction is used to ensure that
 *  the data is not lost if the migration fails at any point.
 */

const { DataTypes, QueryInterface } = require('sequelize')

module.exports = {
    /**
     * upgrade database
     * @param {QueryInterface} context Sequelize.QueryInterface
     */
    up: async (context) => {
        // start a transaction
        await context.sequelize.transaction(async (t) => {
            const dataOriginal = await context.select(null, 'AccessTokens')
            // create a duplicate of the AccessTokens table but with an `id` column
            await context.createTable('AccessTokens2', {
                id: {
                    type: DataTypes.INTEGER,
                    primaryKey: true,
                    autoIncrement: true
                },
                token: {
                    type: DataTypes.STRING,
                    primaryKey: false,
                    allowNull: false,
                    unique: true
                },
                expiresAt: { type: DataTypes.DATE },
                scope: {
                    type: DataTypes.STRING,
                    allowNull: false
                },
                ownerId: { type: DataTypes.STRING },
                ownerType: { type: DataTypes.STRING },
                refreshToken: { type: DataTypes.STRING },
                createdAt: { type: DataTypes.DATE, allowNull: false },
                updatedAt: { type: DataTypes.DATE, allowNull: false }
            }, { transaction: t })

            // copy the data from the old table to the new table
            await context.bulkInsert('AccessTokens2', dataOriginal, { transaction: t })

            // ensure that the data was copied correctly
            const dataIntermediate = await context.select(null, 'AccessTokens2', { transaction: t })
            if (dataOriginal.length !== dataIntermediate.length) {
                throw new Error('Migration failed: data was not copied correctly')
            }
            const dataOriginalJSON = JSON.stringify(dataOriginal)
            const dataIntermediateJSON = JSON.stringify(dataIntermediate.map((row) => { delete row.id; return row }))
            if (dataOriginalJSON !== dataIntermediateJSON) {
                throw new Error('Migration failed: data was not copied correctly')
            }

            // drop the old table
            await context.dropTable('AccessTokens', { transaction: t })
            // rename the new table to the old table name
            await context.renameTable('AccessTokens2', 'AccessTokens', { transaction: t })

            // ensure that the data was copied correctly
            const dataFinal = await context.select(null, 'AccessTokens', { transaction: t })
            if (dataOriginal.length !== dataFinal.length) {
                throw new Error('Migration failed: data was not copied correctly')
            }
            const dataFinalJSON = JSON.stringify(dataFinal.map((row) => { delete row.id; return row }))
            if (dataOriginalJSON !== dataFinalJSON) {
                throw new Error('Migration failed: data was not copied correctly')
            }
        })
    },
    down: async (context) => {
    }
}
