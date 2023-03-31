const FF_UTIL = require('flowforge-test-utils')
const { Roles } = FF_UTIL.require('forge/lib/roles')

const TestModelFactory = require('../../../lib/TestModelFactory')

module.exports = async function (config = {}) {
    const forge = await FF_UTIL.setupApp(config)
    await forge.db.models.PlatformSettings.upsert({ key: 'setup:initialised', value: true })

    const factory = new TestModelFactory(forge)

    const userAlice = await factory.createUser({
        admin: true,
        username: 'alice',
        name: 'Alice Skywalker',
        email: 'alice@example.com',
        password: 'aaPassword'
    })

    const team1 = await factory.createTeam({ name: 'ATeam' })
    await team1.addUser(userAlice, { through: { role: Roles.Owner } })

    const template = await factory.createProjectTemplate({
        name: 'template1',
        settings: {
            httpAdminRoot: '',
            codeEditor: ''
        },
        policy: {
            httpAdminRoot: true,
            dashboardUI: true,
            codeEditor: true
        }
    }, userAlice)

    const projectType = await factory.createProjectType({
        name: 'projectType1',
        description: 'default project type',
        properties: { foo: 'bar' }
    })

    const stack = await factory.createStack({ name: 'stack1' }, projectType)

    const application = await factory.createApplication({ name: 'application-1' }, team1)

    const instance = await factory.createInstance(
        { name: 'project1' },
        application,
        stack,
        template,
        projectType,
        { start: false }
    )

    forge.factory = factory

    forge.defaultTeamType = await forge.db.models.TeamType.findOne()
    forge.team = team1
    forge.stack = stack
    forge.template = template
    forge.projectType = projectType
    forge.application = application
    forge.project = instance

    return forge
}
