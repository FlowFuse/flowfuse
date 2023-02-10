const { Op } = require('sequelize')
const { KEY_BILLING_STATE } = require('../../../db/models/ProjectSettings')

const ONE_DAY = 86400000

module.exports.init = function (app) {
    async function trialTask (app) {
        // Find teams that have expired since we last ran (trialEndsAt != null && < now)
        const expiredSubscriptions = await app.db.models.Subscription.findAll({
            where: { trialEndsAt: { [Op.lt]: Date.now() } },
            include: [app.db.models.Team]
        })

        for (const subscription of expiredSubscriptions) {
            if (subscription.isActive()) {
                // The subscription has been setup on Stripe.
                // Add all trial projects to billing.
                const trialProjects = await addTrialProjectsToBilling(subscription.Team)
                let trialProjectName
                if (trialProjects.length > 0) {
                    trialProjectName = trialProjects[0].name
                }
                await sendTrialEmail(subscription.Team, 'TrialTeamEnded', {
                    trialProjectName
                })
                // Ensure device count is updated (if device billing enabled)
                await subscription.Team.reload({ include: [app.db.models.TeamType] })
                await app.billing.updateTeamDeviceCount(subscription.Team)
            } else {
                // Stripe not configured - suspend the lot
                await suspendAllProjects(subscription.Team)
                await sendTrialEmail(subscription.Team, 'TrialTeamSuspended', {
                    teamSettingsURL: `${app.config.base_url}/team/${subscription.Team.slug}/billing`
                })
            }

            // We have dealt with this team
            subscription.trialEndsAt = null
            subscription.trialStatus = app.db.models.Subscription.TRIAL_STATUS.ENDED
            await subscription.save()
        }

        // Email sending intervals
        // - 8 days => Subscription.status = TRIAL_STATUS.WEEK_EMAIL_SENT
        // - 2 days => Subscription.status = TRIAL_STATUS.DAY_EMAIL_SENT

        const pendingEmailSubscriptions = await app.db.models.Subscription.findAll({
            where: {
                [Op.or]: [
                    {
                        // Expires in 8 days, need to send Week Reminder email
                        trialStatus: app.db.models.Subscription.TRIAL_STATUS.CREATED,
                        trialEndsAt: { [Op.lt]: Date.now() + (8 * ONE_DAY) }
                    },
                    {
                        // Expires in 2 days, need to send Day Reminder email
                        trialStatus: app.db.models.Subscription.TRIAL_STATUS.WEEK_EMAIL_SENT,
                        trialEndsAt: { [Op.lt]: Date.now() + (2 * ONE_DAY) }
                    }
                ]
            },
            include: [app.db.models.Team]
        })

        for (const subscription of pendingEmailSubscriptions) {
            const endingInDurationDays = Math.ceil((subscription.trialEndsAt - Date.now()) / ONE_DAY)
            const endingInDuration = endingInDurationDays + ' day' + ((endingInDurationDays !== 1) ? 's' : '')
            await sendTrialEmail(subscription.Team, 'TrialTeamReminder', {
                endingInDuration,
                billingSetup: subscription.isActive()
            })
            if (subscription.trialStatus === app.db.models.Subscription.TRIAL_STATUS.CREATED) {
                subscription.trialStatus = app.db.models.Subscription.TRIAL_STATUS.WEEK_EMAIL_SENT
            } else {
                subscription.trialStatus = app.db.models.Subscription.TRIAL_STATUS.DAY_EMAIL_SENT
            }
            await subscription.save()
        }
    }

    async function sendTrialEmail (team, template, inserts) {
        const owners = await team.getOwners()
        for (const user of owners) {
            await app.postoffice.send(
                user,
                template,
                {
                    username: user.name,
                    teamName: team.name,
                    ...inserts
                }
            )
        }
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
            if (project.Project.state !== 'suspended') {
                await app.billing.addProject(team, project.Project)
            } else {
                await project.Project.updateSetting(KEY_BILLING_STATE, app.db.models.ProjectSettings.BILLING_STATES.NOT_BILLED)
            }
        }
        return trialProjects
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
