const TestModelFactory = require('../../../lib/TestModelFactory')

const FF_UTIL = require('flowforge-test-utils')

module.exports = async function (config = {}) {
    config.housekeeper = config.housekeeper || false
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
    await team1.addUser(userAlice, { through: { role: factory.Roles.Roles.Owner } })

    const template = await factory.createProjectTemplate({
        name: 'template1',
        settings: {
            httpAdminRoot: '',
            codeEditor: '',
            palette: {
                npmrc: 'example npmrc',
                catalogue: ['https://example.com/catalog'],
                modules: [
                    { name: 'node-red-dashboard', version: '3.0.0' },
                    { name: 'node-red-contrib-ping', version: '0.3.0' }
                ]
            }
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

    forge.adminUser = userAlice

    forge.defaultTeamType = await forge.db.models.TeamType.findOne({ where: { id: 1 } })
    // Need to give the default TeamType permission to use projectType instances
    const defaultTeamTypeProperties = forge.defaultTeamType.properties
    defaultTeamTypeProperties.instances = {
        [projectType.hashid]: { active: true }
    }
    forge.defaultTeamType.properties = defaultTeamTypeProperties
    await forge.defaultTeamType.save()

    forge.team = team1
    forge.stack = stack
    forge.template = template
    forge.projectType = projectType
    forge.application = application
    forge.project = instance

    return forge
}
