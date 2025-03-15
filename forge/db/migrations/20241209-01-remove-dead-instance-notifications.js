/**
 * Remove Notifications for deleted Instances
 */

const deletedProjects = []
const foundProjects = []

module.exports = {
    /**
     * @param {QueryInterface} queryInterface Sequelize.QueryInterface
     */
    up: async (context) => {
        const deleteNotification = async function (id) {
            const deleteQuery = `DELETE FROM "Notifications" WHERE "id" = ${id};`
            await context.sequelize.query(deleteQuery)
        }

        const lookup = 'SELECT "id", "reference" from "Notifications" ' +
            'WHERE "type" = \'instance-crashed\' OR "type" = \'instance-safe-mode\';'
        const [notifications] = await context.sequelize.query(lookup)
        for (const notification of notifications) {
            const projectId = notification.reference.split(':')[1]
            if (deletedProjects.includes(projectId)) {
                // already found project to be gone, delete
                deleteNotification(notification.id)
            } else {
                if (!foundProjects.includes(projectId)) {
                    const projectQuery = `SELECT count(*) as c from "Projects" WHERE "id" = '${projectId}' LIMIT 1;`
                    const [[projectCount]] = await context.sequelize.query(projectQuery)
                    const count = parseInt(projectCount.c)
                    if (count === 0) {
                        // delete notification
                        deletedProjects.push(projectId)
                        deleteNotification(notification.id)
                    } else {
                        foundProjects.push(projectId)
                    }
                }
            }
        }
    },
    down: async (context) => {}
}
