const FF_UTIL = require('flowforge-test-utils')
const { Roles } = FF_UTIL.require('forge/lib/roles')

module.exports = async function (config = {}) {
    const forge = await FF_UTIL.setupApp(config)

    await forge.db.models.PlatformSettings.upsert({ key: 'setup:initialised', value: true })

    forge.defaultTeamType = await forge.db.models.TeamType.findOne()

    const userAlice = await forge.db.models.User.create({ admin: true, username: 'alice', name: 'Alice Skywalker', email: 'alice@example.com', email_verified: true, password: 'aaPassword' })
    const team1 = await forge.db.models.Team.create({ name: 'ATeam', TeamTypeId: forge.defaultTeamType.id })
    await team1.addUser(userAlice, { through: { role: Roles.Owner } })

    const projectType = {
        name: 'projectType1',
        description: 'default project type',
        active: true,
        properties: { foo: 'bar' },
        order: 1
    }
    forge.projectType = await forge.db.models.ProjectType.create(projectType)

    const templateProperties = {
        name: 'template1',
        active: true,
        description: '',
        settings: {
            httpAdminRoot: '',
            codeEditor: ''
        },
        policy: {
            httpAdminRoot: true,
            dashboardUI: true,
            codeEditor: true
        }
    }
    const template = await forge.db.models.ProjectTemplate.create(templateProperties)
    template.setOwner(userAlice)
    await template.save()

    const stackProperties = {
        name: 'stack1',
        active: true,
        properties: { nodered: '2.2.2' }
    }
    const stack = await forge.db.models.ProjectStack.create(stackProperties)

    await stack.setProjectType(forge.projectType)

    const project1 = await forge.db.models.Project.create({ name: 'project1', type: '', url: '' })
    await team1.addProject(project1)
    await project1.setProjectStack(stack)
    await project1.setProjectTemplate(template)
    await project1.setProjectType(forge.projectType)

    await project1.reload({
        include: [
            { model: forge.db.models.Team }
        ]
    })
    forge.team = team1
    forge.project = project1
    forge.template = template
    forge.stack = stack

    return forge
}
