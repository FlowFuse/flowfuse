const sinon = require('sinon')

module.exports = (testSpecificMock = {}) => {
    let stripeData = {}
    let stripeItems = {}
    let stripeItemCounter = 0
    const sandbox = sinon.createSandbox()
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
            retrieve: sandbox.stub().resolves({ name: 'user', balance: 0 }),
            createBalanceTransaction: sandbox.stub().resolves({ status: 'ok' })
        },
        subscriptions: {
            create: (subId) => {
                if (!stripeData[subId]) {
                    stripeData[subId] = { metadata: {}, items: { data: [] } }
                }
            },
            retrieve: sandbox.stub().callsFake(async function (subId) {
                if (!stripeData[subId]) {
                    stripeData[subId] = { metadata: {}, items: { data: [] } }
                }
                return stripeData[subId]
            }),
            update: sandbox.stub().callsFake(async function (subId, update) {
                if (!stripeData[subId]) {
                    throw new Error('unknown subscription')
                }
                if (update.metadata) {
                    stripeData[subId].metadata = update.metadata
                }
                // This is the initial add of an item
                if (update.items) {
                    // Do not mutate the passed-in object as we have tests
                    // that check these functions were called with the expected object

                    const existingItems = {}
                    stripeData[subId].items.data.forEach(item => {
                        existingItems[item.id] = item
                    })

                    update.items.forEach(item => {
                        if (item.deleted) {
                            delete existingItems[item.id]
                            delete stripeItems[item.id]
                        } else if (item.id) {
                            existingItems[item.id].quantity = item.quantity
                        } else {
                            const id = `item-${stripeItemCounter++}`
                            existingItems[id] = {
                                id,
                                quantity: item.quantity,
                                price: { id: item.price, product: item.price.replace('price', 'product') }
                            }
                            stripeItems[id] = existingItems[id]
                        }
                    })
                    stripeData[subId].items = {
                        data: Object.values(existingItems)
                    }
                }
            }),
            del: sandbox.stub()
        },
        subscriptionItems: {
            update: sandbox.stub().callsFake(async function (itemId, update) {
                if (!stripeItems[itemId]) {
                    throw new Error('unknown item')
                }
                for (const [key, value] of Object.entries(update)) {
                    stripeItems[itemId][key] = value
                }
            }),
            del: sandbox.stub().callsFake(async function (itemId, update) {
                if (!stripeItems[itemId]) {
                    throw new Error('unknown item')
                }
                delete stripeItems[itemId]
            })
        },
        promotionCodes: {
            list: async opts => {
                if (opts.code === 'KNOWN_CODE') {
                    return { data: [{ id: 'knownCodeId' }] }
                }
                return { data: [] }
            }
        },
        ...testSpecificMock
    }

    require.cache[require.resolve('stripe')] = {
        exports: function (apiKey) {
            return mock
        }
    }

    mock.clear = () => {
        stripeData = {}
        stripeItems = {}
        stripeItemCounter = 0
        mock._.data = stripeData
        mock._.items = stripeItems
        sandbox.resetHistory()
    }

    return mock
}
