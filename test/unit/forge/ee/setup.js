const FF_UTIL = require('flowforge-test-utils')
const { Roles } = FF_UTIL.require('forge/lib/roles')

module.exports = async function (config = {}) {
    config = {
        license: 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkJlbiBIYXJkaWxsIiwibmJmIjoxNjQ4MTY2NDAwLCJleHAiOjE2Nzk3ODg3OTksIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsImRldiI6dHJ1ZSwiaWF0IjoxNjQ4MjA1MDA3fQ.2swXs50ZJgiQLA9MeoKIepN6BJGGnDqIUQ0FuKUadVjTcUzFekId5RaTpedi14f2iA7qC1w50Ym2egaBFSg1JA',
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
    // const stackProperties = {
    //     name: 'stack1',
    //     active: true,
    //     properties: { nodered: '2.2.2' }
    // }
    // const stack = await forge.db.models.ProjectStack.create(stackProperties)
    const subscription = 'sub_1234567890'
    const customer = 'cus_1234567890'
    await forge.db.controllers.Subscription.createSubscription(team1, subscription, customer)

    forge.team = team1

    return forge
}
