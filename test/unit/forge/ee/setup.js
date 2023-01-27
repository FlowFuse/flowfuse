const FF_UTIL = require('flowforge-test-utils')
const { Roles } = FF_UTIL.require('forge/lib/roles')
const sinon = require('sinon')

async function setup (config = {}) {
    config = {
        license: 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGb3JnZSBJbmMuIERldmVsb3BtZW50IiwibmJmIjoxNjYyNDIyNDAwLCJleHAiOjc5ODY5MDIzOTksIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxNTAsInRlYW1zIjo1MCwicHJvamVjdHMiOjUwLCJkZXZpY2VzIjo1MCwiZGV2Ijp0cnVlLCJpYXQiOjE2NjI0ODI5ODd9.e8Jeppq4aURwWYz-rEpnXs9RY2Y7HF7LJ6rMtMZWdw2Xls6-iyaiKV1TyzQw5sUBAhdUSZxgtiFH5e_cNJgrUg',
        billing: {
            stripe: {
                key: 1234,
                new_customer_free_credit: 1000
            }
        },
        ...config
    }

    const forge = await FF_UTIL.setupApp(config)

    await forge.db.models.PlatformSettings.upsert({ key: 'setup:initialised', value: true })
    const userAlice = await forge.db.models.User.create({ admin: true, username: 'alice', name: 'Alice Skywalker', email: 'alice@example.com', email_verified: true, password: 'aaPassword' })

    forge.defaultTeamType = await forge.db.models.TeamType.findOne()

    const team1 = await forge.db.models.Team.create({ name: 'ATeam', TeamTypeId: forge.defaultTeamType.id })
    await team1.addUser(userAlice, { through: { role: Roles.Owner } })

    await team1.reload({
        include: [{ model: forge.db.models.TeamType }]
    })

    const projectType = {
        name: 'projectType1',
        description: 'default project type',
        active: true,
        properties: {
            billingProductId: 'product_123',
            billingPriceId: 'price_123'
        },
        order: 1
    }
    forge.projectType = await forge.db.models.ProjectType.create(projectType)

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
    await stack.setProjectType(forge.projectType)

    const subscription = 'sub_1234567890'
    const customer = 'cus_1234567890'
    await forge.db.controllers.Subscription.createSubscription(team1, subscription, customer)

    forge.user = userAlice
    forge.team = team1
    forge.stack = stack
    forge.template = template

    return forge
}

setup.setupStripe = (testSpecificMock = {}) => {
    const stripeData = {}
    const stripeItems = {}
    let stripeItemCounter = 0

    const mock = {
        _: {
            data: stripeData,
            items: stripeItems
        },
        checkout: {
            sessions: {
                create: sub => JSON.parse(JSON.stringify(sub))
            }
        },
        customers: {
            createBalanceTransaction: sinon.stub().resolves({ status: 'ok' })
        },
        subscriptions: {
            retrieve: sinon.stub().callsFake(async function (subId) {
                if (!stripeData[subId]) {
                    stripeData[subId] = { metadata: {}, items: { data: [] } }
                }
                return stripeData[subId]
            }),
            update: sinon.stub().callsFake(async function (subId, update) {
                if (!stripeData[subId]) {
                    throw new Error('unknown subscription')
                }
                if (update.metadata) {
                    stripeData[subId].metadata = update.metadata
                }
                // This is the initial add of an item
                if (update.items) {
                    update.items.forEach(item => {
                        item.id = `item-${stripeItemCounter++}`
                        item.plan = {
                            product: item.price.replace('price', 'product')
                        }
                        stripeItems[item.id] = item
                    })
                    stripeData[subId].items = {
                        data: update.items
                    }
                }
            })
        },
        subscriptionItems: {
            update: sinon.stub().callsFake(async function (itemId, update) {
                if (!stripeItems[itemId]) {
                    throw new Error('unknown item')
                }
                for (const [key, value] of Object.entries(update)) {
                    stripeItems[itemId][key] = value
                }
            })
        },
        ...testSpecificMock
    }
    require.cache[require.resolve('stripe')] = {
        exports: function (apiKey) {
            return mock
        }
    }
    return mock
}
setup.resetStripe = () => {
    delete require.cache[require.resolve('stripe')]
}

module.exports = setup
