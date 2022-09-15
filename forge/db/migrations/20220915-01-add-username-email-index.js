/**
 * Adds unique indexes on User.username and User.email with lower-case applied
 */

module.exports = {
    up: async (context) => {
        await context.addIndex('Users', { name: 'user_username_lower_unique', fields: [context.sequelize.fn('lower', context.sequelize.col('username'))], unique: true })
        await context.addIndex('Users', { name: 'user_email_lower_unique', fields: [context.sequelize.fn('lower', context.sequelize.col('email'))], unique: true })
    },
    down: async (context) => {
    }
}
