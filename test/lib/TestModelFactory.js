const Roles = require('../../forge/lib/roles')

module.exports = class TestModelFactory {
    constructor (forge) {
        this.forge = forge
    }

    async createUser (details) {
        return await this.forge.db.models.User.create({
            ...{ admin: false, email_verified: true, password_expired: false },
            ...details
        })
    }

    async createInvitation (team, fromUser, toUser, role = Roles.Member) {
        const invitation = await this.forge.db.controllers.Invitation.createInvitations(
            fromUser,
            team,
            [toUser.email],
            role
        )
        return invitation
    }

    async createTeam (teamDetails) {
        const defaultTeamType = await this.forge.db.models.TeamType.findOne()
        const defaultTeamDetails = {
            name: 'unnamed-team',
            TeamTypeId: defaultTeamType.id
        }
        const team = await this.forge.db.models.Team.create({
            ...defaultTeamDetails,
            ...teamDetails
        })

        // force the DB to populate the TeamType- otherwise it just contains hte type id and falls
        team.reload({
            include: ['TeamType']
        })

        return team
    }

    async createSubscription (team, subscriptionId = 'sub_1234567890', customerId = 'cus_1234567890') {
        return await this.forge.db.controllers.Subscription.createSubscription(team, subscriptionId, customerId)
    }

    async createTrialSubscription (team, days = 1) {
        return await this.forge.db.controllers.Subscription.createTrialSubscription(team, Date.now() + (days * 86400000))
    }

    async createStack (stackProperties, projectType) {
        const defaultProperties = {
            name: 'unnamed-stack',
            active: true,
            properties: { nodered: '2.2.2' }
        }
        const stack = await this.forge.db.models.ProjectStack.create({
            ...defaultProperties,
            ...stackProperties
        })
        await stack.setProjectType(projectType)
        return stack
    }

    async createProjectType (projectTypeProperties) {
        const defaultTypeProperties = {
            name: 'unnamed-project-type',
            description: 'project type description',
            active: true,
            order: 1,
            properties: {}
        }
        const projectType = await this.forge.db.models.ProjectType.create({
            ...defaultTypeProperties,
            ...projectTypeProperties
        })
        return projectType
    }

    async createProjectTemplate (templateProperties, owner) {
        const defaultTemplateProperties = {
            name: 'unnamed-template',
            active: true,
            description: '',
            settings: {
                httpAdminRoot: ''
            },
            policy: {
                httpAdminRoot: true
            }
        }
        const template = await this.forge.db.models.ProjectTemplate.create({
            ...defaultTemplateProperties,
            ...templateProperties
        })
        template.setOwner(owner)
        await template.save()
        return template
    }

    async createApplication (applicationDetails, team) {
        const defaultApplicationDetails = {
            name: 'unnamed-application'
        }

        return await this.forge.db.models.Application.create({
            ...defaultApplicationDetails,
            ...applicationDetails,
            TeamId: team.id
        })
    }

    async createInstance (projectDetails, application, stack, template, projectType, { start = true } = {}) {
        const defaultProjectDetails = {
            name: 'unnamed-project',
            type: '',
            url: '' // added by wrapper.start()
        }

        const instance = await this.forge.db.models.Project.create({
            ...defaultProjectDetails,
            ...projectDetails,
            ApplicationId: application.id,
            TeamId: application.TeamId
        })
        await instance.setProjectStack(stack)
        await instance.setProjectTemplate(template)
        await instance.setProjectType(projectType)
        await instance.updateSetting('settings', { header: { title: instance.name } })
        await instance.reload({
            include: [
                { model: this.forge.db.models.Team },
                { model: this.forge.db.models.ProjectType },
                { model: this.forge.db.models.ProjectStack },
                { model: this.forge.db.models.ProjectTemplate },
                { model: this.forge.db.models.ProjectSettings }
            ]
        })
        if (start) {
            const result = await this.forge.containers.start(instance) // ensure project is initialized
            await result.started
        }
        return instance
    }

    async createDevice (deviceDetails, team, project = null) {
        const defaultDeviceDetails = {
            name: 'unnamed-device',
            type: 'unnamed-type',
            credentialSecret: ''
        }
        const device = await this.forge.db.models.Device.create({
            ...defaultDeviceDetails,
            ...deviceDetails
        })
        await team.addDevice(device)
        if (project) {
            await device.setProject(project)
        }
        return device
    }

    async createSnapshot (snapshotDetails, project, user) {
        const defaultSnapshotDetails = {
            name: 'unnamed-snapshot',
            description: ''
        }
        return await this.forge.db.controllers.ProjectSnapshot.createSnapshot(project, user, {
            ...defaultSnapshotDetails,
            ...snapshotDetails
        })
    }

    async createPipeline (pipelineDetails, application) {
        const defaultPipelineDetails = {
            name: 'unnamed-pipeline',
            ApplicationId: application.id
        }

        return await this.forge.db.models.Pipeline.create({
            ...defaultPipelineDetails,
            ...pipelineDetails
        })
    }

    async createPipelineStage (pipelineStageDetails, pipeline) {
        const defaultPipelineStageDetails = {
            name: 'unnamed-pipeline-stage',
            instanceId: null
        }

        return await this.forge.db.controllers.Pipeline.addPipelineStage(
            pipeline,
            {
                ...defaultPipelineStageDetails,
                ...pipelineStageDetails
            }
        )
    }
}
