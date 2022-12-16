const FF_UTIL = require('flowforge-test-utils')
const { Roles } = FF_UTIL.require('forge/lib/roles')

module.exports = async function (config = {}) {
    config = {
        license: 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGb3JnZSBJbmMuIERldmVsb3BtZW50IiwibmJmIjoxNjYyNDIyNDAwLCJleHAiOjc5ODY5MDIzOTksIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxNTAsInRlYW1zIjo1MCwicHJvamVjdHMiOjUwLCJkZXZpY2VzIjo1MCwiZGV2Ijp0cnVlLCJpYXQiOjE2NjI0ODI5ODd9.e8Jeppq4aURwWYz-rEpnXs9RY2Y7HF7LJ6rMtMZWdw2Xls6-iyaiKV1TyzQw5sUBAhdUSZxgtiFH5e_cNJgrUg',
        billing: {
            stripe: {
                key: 1234
            }
        },
        ...config
    }

    const forge = await FF_UTIL.setupApp(config)

    await forge.db.models.PlatformSettings.upsert({ key: 'setup:initialised', value: true })
    const userAlice = await forge.db.models.User.create({ admin: true, username: 'alice', name: 'Alice Skywalker', email: 'alice@example.com', email_verified: true, password: 'aaPassword' })

    const defaultTeamType = await forge.db.models.TeamType.findOne()

    const team1 = await forge.db.models.Team.create({ name: 'ATeam', TeamTypeId: defaultTeamType.id })
    await team1.addUser(userAlice, { through: { role: Roles.Owner } })

    await team1.reload({
        include: [{ model: forge.db.models.TeamType }]
    })
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

    const subscription = 'sub_1234567890'
    const customer = 'cus_1234567890'
    await forge.db.controllers.Subscription.createSubscription(team1, subscription, customer)

    forge.user = userAlice
    forge.team = team1
    forge.stack = stack

    return forge
}
