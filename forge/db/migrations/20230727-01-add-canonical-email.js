/**
 * Add canonicalEmail to Users table
 */

// eslint-disable-next-line no-unused-vars
const { DataTypes, QueryInterface, col } = require('sequelize')

const { getCanonicalEmail } = require('../utils.js')

module.exports = {
    /**
     * upgrade database
     * @param {QueryInterface} context Sequelize.QueryInterface
     */
    up: async (context) => {
        try {
            await context.addColumn('Users', 'canonicalEmail', {
                type: DataTypes.STRING,
                defaultValue: null,
                allowNull: true,
                unique: true
            })
        } catch (err) {
            if (err.message.includes('duplicate column name')) {
                // SQLITE
                // ignore error if column already exists
            } else if (err.message.includes('already exists')) {
                // PG
                // ignore error if column already exists
            } else {
                throw err
            }
        }
        // now update all existing users with their canonical email

        // NOTE: This is a one-time migration, so we don't need to worry about
        // performance. If we did, we would need to do this in batches

        // NOTE: We are doing this row-by-row because we want to ensure that
        // the existing duplicate accounts are permitted to have the same
        // canonical email as another account so that we don't break any existing accounts

        // read in all users
        const users = await context.sequelize.query(`
            SELECT "id", "email"
            FROM "Users"
            WHERE "email" IS NOT NULL
        `)
        
        const userRows = users[0]

        // update canonical email for each user
        for (const user of userRows) {
            user.canonicalEmail = getCanonicalEmail(user.email)
        }

        // find all users with duplicate canonical emails & set all to null
        const duplicates = userRows.filter((user, index, self) => {
            return index !== self.findIndex((u) => {
                return u.canonicalEmail === user.canonicalEmail
            })
        })
        for (const user of duplicates) {
            user.canonicalEmail = null
        }

        // update each user
        for (const user of users[0]) {
            const canonicalEmail = getCanonicalEmail(user.email)
            // update the user
            await context.sequelize.query(`
                UPDATE "Users"
                SET "canonicalEmail" = :canonicalEmail
                WHERE "id" = :id
            `, {
                replacements: {
                    id: user.id,
                    canonicalEmail
                }
            })
        }
    },
    down: async (context) => {
    }
}
