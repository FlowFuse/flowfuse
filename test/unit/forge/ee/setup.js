const TestModelFactory = require('../../../lib/TestModelFactory')
const StripeMock = require('../../../lib/stripeMock')

const FF_UTIL = require('flowforge-test-utils')

const { Roles } = FF_UTIL.require('forge/lib/roles')

async function setup (config = {}) {
    config = {
        housekeeper: false,
        license: 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGb3JnZSBJbmMuIERldmVsb3BtZW50IiwibmJmIjoxNjYyNDIyNDAwLCJleHAiOjc5ODY5MDIzOTksIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxNTAsInRlYW1zIjo1MCwicHJvamVjdHMiOjUwLCJkZXZpY2VzIjo1MCwiZGV2Ijp0cnVlLCJpYXQiOjE2NjI0ODI5ODd9.e8Jeppq4aURwWYz-rEpnXs9RY2Y7HF7LJ6rMtMZWdw2Xls6-iyaiKV1TyzQw5sUBAhdUSZxgtiFH5e_cNJgrUg',
        billing: {
            stripe: {
                key: 1234,
                new_customer_free_credit: 1000,
                device_price: 'd123',
                device_product: 'd456'
            }
        },
        ...config
    }

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

    if (config.billing) {
        await factory.createSubscription(team1)
    }

    const template = await factory.createProjectTemplate(
        { name: 'template1', settings: {}, policy: {} },
        userAlice
    )

    const projectType = await factory.createProjectType({
        name: 'projectType1',
        description: 'default project type',
        properties: {
            billingProductId: 'product_123',
            billingPriceId: 'price_123'
        }
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

    forge.defaultTeamType = await forge.db.models.TeamType.findOne({ where: { id: 1 } })
    // Need to give the default TeamType permission to use projectType instances
    const defaultTeamTypeProperties = forge.defaultTeamType.properties
    defaultTeamTypeProperties.instances = {
        [projectType.hashid]: { active: true }
    }
    forge.defaultTeamType.properties = defaultTeamTypeProperties
    await forge.defaultTeamType.save()

    forge.user = userAlice
    forge.team = team1
    forge.stack = stack
    forge.template = template
    forge.projectType = projectType
    forge.application = application
    forge.project = forge.instance = instance

    return forge
}

setup.setupStripe = StripeMock
setup.resetStripe = () => {
    delete require.cache[require.resolve('stripe')]
}

module.exports = setup
