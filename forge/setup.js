module.exports.finishSetup = async function (app) {
    try {
        const adminUser = await app.db.models.User.findOne({
            where: {
                admin: true
            }
        })
        const projectType = await app.db.controllers.ProjectType.createDefaultProjectType()
        app.log.info('[SETUP] Created default InstanceType')

        await app.db.controllers.TeamType.enableInstanceTypeForDefaultType(projectType)
        app.log.info('[SETUP] Enabled default InstanceType for default TeamType')

        await app.db.controllers.ProjectTemplate.createDefaultTemplate(adminUser)
        app.log.info('[SETUP] Created default Template')

        await app.db.controllers.ProjectStack.createDefaultProjectStack(projectType)
        app.log.info('[SETUP] Created default Stack')

        await app.settings.set('setup:initialised', true)

        app.log.info('****************************************************')
        app.log.info('* FlowForge setup is complete. You can login at:   *')
        app.log.info(`*   ${app.config.base_url.padEnd(47, ' ')}*`)
        app.log.info('****************************************************')
    } catch (err) {
        app.log.error(`Failed to create default ProjectStack: ${err.toString()}`)
        console.error(err.stack)
        throw err
    }
}
