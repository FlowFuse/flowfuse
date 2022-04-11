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

    await forge.db.models.PlatformSettings.upsert({ key: 'setup:initialised', value: true })
    const userAlice = await forge.db.models.User.create({ admin: true, username: 'alice', name: 'Alice Skywalker', email: 'alice@example.com', email_verified: true, password: 'aaPassword' })
    const team1 = await forge.db.models.Team.create({ name: 'ATeam' })
    await team1.addUser(userAlice, { through: { role: Roles.Owner } })

    const templateProperties = {
        name: 'template1',
        active: true,
        description: '',
        settings: {},
        policy: {}
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
    const project1 = await forge.db.models.Project.create({ name: 'project1', type: '', url: '' })
    await team1.addProject(project1)
    await project1.setProjectStack(stack)
    await project1.setProjectTemplate(template)

    forge.project = project1
    return forge
}
