/* eslint-disable no-unused-vars */
/**
 * Create an Application object for each Project in the database
 */
const { DataTypes, QueryInterface, QueryTypes } = require('sequelize')

module.exports = {
    /**
     * @param {QueryInterface} context Sequelize.QueryInterface
     */
    up: async (context) => {
        // Get a list of all projects
        const projects = await context.sequelize.query('select "id", "name", "TeamId", "createdAt", "updatedAt" from "Projects"', { type: QueryTypes.SELECT })
        for (const project of projects) {
            await context.sequelize.transaction(async (transaction) => {
                // Create an Application with matching name
                const [results, metadata] = await context.sequelize.query(
                    'INSERT into "Applications" ("name", "TeamId", "createdAt", "updatedAt") VALUES (?,?,?,?)',
                    {
                        replacements: [
                            project.name,
                            project.TeamId,
                            project.createdAt,
                            project.updatedAt
                        ],
                        transaction
                    }
                )
                // Update the Project's ApplicationId
                await context.sequelize.query(
                    `UPDATE "Projects"
                     SET ApplicationId = ?
                     WHERE id = ?`,
                    {
                        replacements: [
                            metadata.lastID,
                            project.id
                        ],
                        transaction
                    }
                )
            })
        }
    },
    down: async (context) => {
    }
}
