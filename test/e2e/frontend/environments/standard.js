const FF_UTIL = require('flowforge-test-utils')
const Forge = FF_UTIL.require('forge/forge.js')
const { Roles } = FF_UTIL.require('forge/lib/roles')
const { LocalTransport } = require('flowforge-test-utils/forge/postoffice/localTransport.js')

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
    // full platform & team admin
    const userAlice = await forge.db.models.User.create({ admin: true, username: 'alice', name: 'Alice Skywalker', email: 'alice@example.com', email_verified: true, password: 'aaPassword' })
    // team admin, not platform admin
    const userBob = await forge.db.models.User.create({ admin: false, username: 'bob', name: 'Bob Solo', email: 'bob@example.com', email_verified: true, password: 'bbPassword' })
    // no admin rights
    // eslint-disable-next-line no-unused-vars
    const userCharlie = await forge.db.models.User.create({ admin: false, username: 'charlie', name: 'Charlie Palpatine', email: 'charlie@example.com', email_verified: true, password: 'ccPassword' })
    // non admin, not in any team but will be invited and removed as required
    // eslint-disable-next-line no-unused-vars
    const userDave = await forge.db.models.User.create({ username: 'dave', name: 'Dave Vader', email: 'dave@example.com', password: 'ddPassword', email_verified: true, password_expired: false })

    const defaultTeamType = await forge.db.models.TeamType.findOne()

    const team1 = await forge.db.models.Team.create({ name: 'ATeam', TeamTypeId: defaultTeamType.id })
    await team1.addUser(userAlice, { through: { role: Roles.Owner } })
    await team1.addUser(userBob, { through: { role: Roles.Owner } })
    // await team1.addUser(userCharlie, { through: { role: Roles.Member } })

    const templateProperties = {
        name: 'template1',
        active: true,
        description: '',
        settings: {
            httpAdminRoot: ''
        },
        policy: {
            httpAdminRoot: true
        }
    }
    const template = await forge.db.models.ProjectTemplate.create(templateProperties)
    template.setOwner(userAlice)
    await template.save()
    const projectTypeProperties = {
        name: 'type1',
        description: 'project type description',
        active: true,
        order: 1,
        properties: {}
    }
    const projectType = await forge.db.models.ProjectType.create(projectTypeProperties)
    const stackProperties = {
        name: 'stack1',
        active: true,
        properties: { nodered: '2.2.2' }
    }
    const stack = await forge.db.models.ProjectStack.create(stackProperties)
    await stack.setProjectType(projectType)
    const project1 = await forge.db.models.Project.create({ name: 'project1', type: '', url: '' })
    await team1.addProject(project1)
    await project1.setProjectStack(stack)
    await project1.setProjectTemplate(template)

    forge.project = project1
    forge.template = template
    forge.stack = stack
    return forge
}
