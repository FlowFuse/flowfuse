const FF_UTIL = require('flowforge-test-utils')
const Forge = FF_UTIL.require('forge/forge.js')
const { Roles } = FF_UTIL.require('forge/lib/roles')
const { LocalTransport } = require('flowforge-test-utils/forge/postoffice/localTransport.js')

class TestModelFactory {
    constructor (forge) {
        this.forge = forge
    }

    async createUser (details) {
        return await this.forge.db.models.User.create({
            ...{ admin: false, email_verified: true, password_expired: false },
            ...details
        })
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

    async createProject (projectDetails, team, stack, template, projectType) {
        const defaultProjectDetails = {
            name: 'unnamed-project',
            type: '',
            url: ''
        }
        const project = await this.forge.db.models.Project.create({
            ...defaultProjectDetails,
            ...projectDetails
        })
        await team.addProject(project)
        await project.setProjectStack(stack)
        await project.setProjectTemplate(template)
        await project.setProjectType(projectType)
        await project.updateSetting('settings', { header: { title: project.name } })
        await project.reload({
            include: [
                { model: this.forge.db.models.Team },
                { model: this.forge.db.models.ProjectType },
                { model: this.forge.db.models.ProjectStack },
                { model: this.forge.db.models.ProjectTemplate },
                { model: this.forge.db.models.ProjectSettings }
            ]
        })
        await this.forge.containers.start(project) // ensure project is initialized
        return project
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
}

module.exports = async function (settings = {}, config = {}) {
    config = {
        ...config,
        telemetry: { enabled: false },
        logging: {
            level: 'warn'
        },
        db: {
            type: 'sqlite',
            storage: ':memory:'
        },
        email: {
            enabled: true,
            transport: new LocalTransport()
        },
        driver: {
            type: 'stub'
        }
    }

    const forge = await Forge({ config })
    await forge.settings.set('setup:initialised', true)
    const factory = new TestModelFactory(forge)

    /// Create users
    // full platform & team1 admin
    const userAlice = await factory.createUser({ admin: true, username: 'alice', name: 'Alice Skywalker', email: 'alice@example.com', email_verified: true, password: 'aaPassword' })

    // team1 & team2 admin, not platform admin
    const userBob = await factory.createUser({ username: 'bob', name: 'Bob Solo', email: 'bob@example.com', email_verified: true, password: 'bbPassword' })

    // no admin rights
    // eslint-disable-next-line no-unused-vars
    const userCharlie = await factory.createUser({ username: 'charlie', name: 'Charlie Palpatine', email: 'charlie@example.com', email_verified: true, password: 'ccPassword' })

    // non admin, not in any team but will be invited and removed as required
    const userDave = await factory.createUser({ username: 'dave', name: 'Dave Vader', email: 'dave@example.com', password: 'ddPassword', email_verified: true, password_expired: false })

    // Platform Setup
    const template = await factory.createProjectTemplate({ name: 'template1' }, userAlice)
    const projectType = await factory.createProjectType({ name: 'type1' })
    const stack = await factory.createStack({ name: 'stack1' }, projectType)

    /// Team 1
    const team1 = await factory.createTeam({ name: 'ATeam' })
    await team1.addUser(userAlice, { through: { role: Roles.Owner } })
    await team1.addUser(userBob, { through: { role: Roles.Owner } })

    // Create a pending invite for Dave to join ATeam
    await forge.db.controllers.Invitation.createInvitations(userAlice, team1, [userDave.email], Roles.Member)

    // Projects
    await factory.createProject({ name: 'project1' }, team1, stack, template, projectType)

    /// Team 2
    const team2 = await factory.createTeam({ name: 'BTeam' })
    await team2.addUser(userBob, { through: { role: Roles.Owner } })

    // Create pending invite for Dave to join BTeam
    await forge.db.controllers.Invitation.createInvitations(userBob, team2, [userDave.email], Roles.Member)

    // Unassigned devices
    await factory.createDevice({ name: 'team2-unassigned-device', type: 'type2' }, team2)

    // Projects
    await factory.createProject({ name: 'project2' }, team2, stack, template, projectType)

    const projectWithDevices = await factory.createProject({ name: 'project-with-devices' }, team2, stack, template, projectType)
    await factory.createDevice({ name: 'assigned-device-a', type: 'type2' }, team2, projectWithDevices)
    await factory.createDevice({ name: 'assigned-device-b', type: 'type2' }, team2, projectWithDevices)
    await factory.createDevice({ name: 'assigned-device-c', type: 'type2' }, team2, projectWithDevices)
    await factory.createSnapshot({ name: 'snapshot 1' }, projectWithDevices, userBob)
    await factory.createSnapshot({ name: 'snapshot 2' }, projectWithDevices, userBob)
    await factory.createSnapshot({ name: 'snapshot 3' }, projectWithDevices, userBob)

    return forge
}
