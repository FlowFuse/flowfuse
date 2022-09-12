const should = require('should') // eslint-disable-line
const setup = require('../../setup')

describe('Billing', function () {
    let app

    function setupStripe (mock) {
        require.cache[require.resolve('stripe')] = {
            exports: function (apiKey) {
                return mock
            }
        }
    }

    afterEach(async function () {
        if (app) {
            await app.close()
            app = null
        }
        delete require.cache[require.resolve('stripe')]
    })
    describe('createSubscriptionSession', async function () {
        beforeEach(async function () {
            setupStripe({
                checkout: {
                    sessions: {
                        create: sub => JSON.parse(JSON.stringify(sub))
                    }
                }
            })
        })
        it('creates a session using default product/price', async function () {
            app = await setup({
                billing: {
                    stripe: {
                        key: 1234,
                        team_product: 'defaultteamprod',
                        team_price: 'defaultteamprice'
                    }
                }
            })

            const result = await app.billing.createSubscriptionSession(app.team)

            result.should.have.property('mode', 'subscription')
            result.should.have.property('client_reference_id', app.team.hashid)
            result.should.have.property('success_url', 'http://localhost:3000/team/ateam/overview?billing_session={CHECKOUT_SESSION_ID}')
            result.should.have.property('cancel_url', 'http://localhost:3000/team/ateam/overview')
            result.should.have.property('subscription_data')
            result.subscription_data.should.have.property('metadata')
            result.subscription_data.metadata.should.have.property('team', app.team.hashid)
            result.should.have.property('line_items')
            result.line_items.should.have.length(1)
            result.line_items[0].should.have.property('price', 'defaultteamprice')
            result.line_items[0].should.have.property('quantity', 1)
        })
        it('creates a session using team type product/price', async function () {
            app = await setup({
                billing: {
                    stripe: {
                        key: 1234,
                        team_product: 'defaultteamprod',
                        team_price: 'defaultteamprice',
                        teams: {
                            starter: {
                                product: 'starterteamprod',
                                price: 'starterteampprice'
                            }
                        }
                    }
                }
            })

            const result = await app.billing.createSubscriptionSession(app.team)

            result.should.have.property('line_items')
            result.line_items.should.have.length(1)
            result.line_items[0].should.have.property('price', 'starterteampprice')
            result.line_items[0].should.have.property('quantity', 1)
        })
        it('includes activation line item if configured', async function () {
            app = await setup({
                billing: {
                    stripe: {
                        key: 1234,
                        team_product: 'defaultteamprod',
                        team_price: 'defaultteamprice',
                        activation_price: 'activationprice'
                    }
                }
            })

            const result = await app.billing.createSubscriptionSession(app.team)

            result.should.have.property('line_items')
            result.line_items.should.have.length(2)
            result.line_items[0].should.have.property('price', 'defaultteamprice')
            result.line_items[0].should.have.property('quantity', 1)
            result.line_items[1].should.have.property('price', 'activationprice')
            result.line_items[1].should.have.property('quantity', 1)
        })
    })

    describe('updateTeamMemberCount', async function () {
        let updateId, updateData
        beforeEach(async function () {
            updateId = null
            updateData = null
            setupStripe({
                subscriptions: {
                    retrieve: async sub => {
                        return {
                            items: {
                                data: [
                                    { id: '123', quantity: 1, plan: { product: 'defaultteamprod' } },
                                    { id: '234', quantity: 27, plan: { product: 'starterteamprod' } }
                                ]
                            }
                        }
                    }
                },
                subscriptionItems: {
                    update: async (id, update) => {
                        updateId = id
                        updateData = update
                    }
                }
            })
        })
        it('does not update team subscription quantity when already correct', async function () {
            // Using `defaultteamprod` which has a quantity of 1 already
            app = await setup({
                billing: {
                    stripe: {
                        key: 1234,
                        team_product: 'defaultteamprod',
                        team_price: 'defaultteamprice'
                    }
                }
            })
            await app.billing.updateTeamMemberCount(app.team)
            should.not.exist(updateId)
            should.not.exist(updateData)
        })
        it('updates team subscription quantity when incorrect', async function () {
            // Using `starterteamprod` which has a quantity of 27
            app = await setup({
                billing: {
                    stripe: {
                        key: 1234,
                        team_product: 'defaultteamprod',
                        team_price: 'defaultteamprice',
                        teams: {
                            starter: {
                                product: 'starterteamprod',
                                price: 'starterteampprice'
                            }
                        }
                    }
                }
            })
            await app.billing.updateTeamMemberCount(app.team)
            should.exist(updateId)
            updateId.should.equal('234')
            should.exist(updateData)
            updateData.should.have.property('quantity', 1)
            updateData.should.have.property('proration_behavior', 'always_invoice')
        })
    })

    describe('updateTeamDeviceCount', async function () {
        let updateId, updateData
        describe('no existing subscription item', async function () {
            beforeEach(async function () {
                updateId = null
                updateData = null
                setupStripe({
                    subscriptions: {
                        retrieve: async sub => {
                            return { items: { data: [] } }
                        },
                        update: async (sub, update) => {
                            updateId = sub
                            updateData = update
                        }
                    }
                })
            })
            it('does not add team device item when billable count is 0', async function () {
                // app.team has no devices
                app = await setup({
                    billing: {
                        stripe: {
                            key: 1234,
                            team_product: 'defaultteamprod',
                            team_price: 'defaultteamprice',
                            device_product: 'defaultdeviceprod',
                            device_price: 'defaultdeviceprice'
                        }
                    }
                })
                await app.billing.updateTeamDeviceCount(app.team)
                should.not.exist(updateId)
                should.not.exist(updateData)
            })
            it('adds team device item when billable count is > 0', async function () {
                // Using `starterteamprod` which has a quantity of 27
                app = await setup({
                    billing: {
                        stripe: {
                            key: 1234,
                            team_product: 'defaultteamprod',
                            team_price: 'defaultteamprice',
                            device_product: 'defaultdeviceprod',
                            device_price: 'defaultdeviceprice',
                            teams: {
                                starter: {
                                    product: 'starterteamprod',
                                    price: 'starterteampprice'
                                }
                            }
                        }
                    }
                })
                const device = await app.db.models.Device.create({ name: 'd1', type: 'd1', credentialSecret: '' })
                await app.team.addDevice(device)

                await app.billing.updateTeamDeviceCount(app.team)
                should.exist(updateId)
                updateId.should.equal('sub_1234567890')
                should.exist(updateData)
                updateData.should.have.property('items')
                updateData.items.should.have.lengthOf(1)
                updateData.items[0].should.have.property('price', 'defaultdeviceprice')
                updateData.items[0].should.have.property('quantity', 1)
            })
        })
        describe('existing subscription item', async function () {
            beforeEach(async function () {
                updateId = null
                updateData = null
                setupStripe({
                    subscriptions: {
                        retrieve: async sub => {
                            return {
                                items: {
                                    data: [
                                        { id: '123', quantity: 27, plan: { product: 'defaultdeviceprod' } }
                                    ]
                                }
                            }
                        }
                    },
                    subscriptionItems: {
                        update: async (id, update) => {
                            updateId = id
                            updateData = update
                        }
                    }
                })
            })
            it('updates device count to 0', async function () {
                // app.team has no devices
                app = await setup({
                    billing: {
                        stripe: {
                            key: 1234,
                            team_product: 'defaultteamprod',
                            team_price: 'defaultteamprice',
                            device_product: 'defaultdeviceprod',
                            device_price: 'defaultdeviceprice'
                        }
                    }
                })
                await app.billing.updateTeamDeviceCount(app.team)
                should.exist(updateId)
                updateId.should.equal('123')
                should.exist(updateData)
                updateData.should.have.property('quantity', 0)
                updateData.should.have.property('proration_behavior', 'always_invoice')
            })
            it('updates device count to 1', async function () {
                // app.team has no devices
                app = await setup({
                    billing: {
                        stripe: {
                            key: 1234,
                            team_product: 'defaultteamprod',
                            team_price: 'defaultteamprice',
                            device_product: 'defaultdeviceprod',
                            device_price: 'defaultdeviceprice'
                        }
                    }
                })
                const device = await app.db.models.Device.create({ name: 'd1', type: 'd1', credentialSecret: '' })
                await app.team.addDevice(device)

                await app.billing.updateTeamDeviceCount(app.team)
                should.exist(updateId)
                updateId.should.equal('123')
                should.exist(updateData)
                updateData.should.have.property('quantity', 1)
                updateData.should.have.property('proration_behavior', 'always_invoice')
            })
        })
    })
})
