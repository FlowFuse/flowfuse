const { Op } = require('sequelize')
const { KEY_BILLING_STATE } = require('../../../db/models/ProjectSettings')

module.exports.init = function (app) {
    async function trialTask (app) {
        // 1. find teams that have expired since we last ran (trialEndsAt != null && < now)

        const expiredSubscriptions = await app.db.models.Subscription.findAll({
            where: { trialEndsAt: { [Op.lt]: Date.now() } },
            include: [app.db.models.Team]
        })

        for (const subscription of expiredSubscriptions) {
            if (subscription.isActive()) {
                // The subscription has been setup on Stripe.
                // Add all trial projects to billing.
                await addTrialProjectsToBilling(subscription.Team)
            } else {
                // Stripe not configured - suspend the lot
                await suspendAllProjects(subscription.Team)
            }

            // We have dealt with this team
            subscription.trialEndsAt = null
            await subscription.save()
        }

        // TODO: send emails at appropriate intervals
    }

    async function addTrialProjectsToBilling (team) {
        // Find all trial projects in the team... there should only be one
        const trialProjects = await app.db.models.ProjectSettings.findAll({
            where: {
                key: KEY_BILLING_STATE,
                value: app.db.models.ProjectSettings.BILLING_STATES.TRIAL
            },
            include: {
                model: app.db.models.Project,
                where: {
                    TeamId: team.id
                }
            }
        })
        for (const project of trialProjects) {
            await app.billing.addProject(team, project.Project)
        }
    }

    async function suspendAllProjects (team) {
        const projects = await team.getProjects()
        for (const project of projects) {
            if (project.state !== 'suspended') {
                // There is some DRY code here with projectActions.js suspend logic.
                // TODO: consider move to controllers.Project
                try {
                    app.db.controllers.Project.setInflightState(project, 'suspending')
                    await app.containers.stop(project)
                    app.db.controllers.Project.clearInflightState(project)
                    await project.updateSetting(KEY_BILLING_STATE, app.db.models.ProjectSettings.BILLING_STATES.NOT_BILLED)
                    await app.auditLog.Project.project.suspended(null, null, project)
                } catch (err) {
                    app.db.controllers.Project.clearInflightState(project)
                    const resp = { code: 'unexpected_error', error: err.toString() }
                    await app.auditLog.Project.project.suspended(null, resp, project)
                }
            }
        }
    }

    return trialTask
}
