/**
 * Backfill adminOptIn for existing admin-owned PATs.
 *
 * The 20260706-01 migration added adminOptIn with a default of false,
 * which broke existing admin PATs by stripping their admin capabilities.
 * This sets adminOptIn = true for all PATs owned by admin users created up to this point.
 */

module.exports = {
    up: async (context) => {
        await context.sequelize.query(
            `UPDATE "AccessTokens"
             SET "adminOptIn" = true
             WHERE "ownerType" = 'user'
               AND "ownerId" IN (
                   SELECT CAST("id" AS VARCHAR) FROM "Users" WHERE "admin" = true
               )`
        )
    },
    down: async (context) => {}
}
