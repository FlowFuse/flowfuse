const should = require('should') // eslint-disable-line
const setup = require('../../setup')

const FF_UTIL = require('flowforge-test-utils')

const { Roles } = FF_UTIL.require('forge/lib/roles')

describe('Billing', function () {
    let app

    let stripe

    afterEach(async function () {
        if (app) {
            await app.close()
            app = null
        }
        setup.resetStripe()
    })

    describe('createSubscriptionSession', async function () {
        beforeEach(async function () {
            setup.setupStripe()
        })

        it('creates a session using default product/price', async function () {
            app = await setup({
                billing: {
                    stripe: {
                        key: 1234,
                        team_product: 'defaultteamproduct',
                        team_price: 'defaultteamprice',
                        device_price: 'defaultdeviceprice',
                        device_product: 'defaultdeviceproduct'
                    }
                }
            })

            const defaultTeamType = await app.db.models.TeamType.findOne({ where: { id: 1 } })
            const newTeam = await app.db.models.Team.create({ name: 'new-team', TeamTypeId: defaultTeamType.id })

            const result = await app.billing.createSubscriptionSession(newTeam)

            result.should.have.property('mode', 'subscription')
            result.should.have.property('client_reference_id', newTeam.hashid)
            result.metadata.should.have.property('teamTypeId', defaultTeamType.hashid)
            result.should.have.property('success_url', 'http://localhost:3000/team/new-team/applications?billing_session={CHECKOUT_SESSION_ID}')
            result.should.have.property('cancel_url', 'http://localhost:3000/team/new-team/applications')
            result.should.have.property('subscription_data')
            result.subscription_data.should.have.property('metadata')
            result.subscription_data.metadata.should.have.property('team', newTeam.hashid)
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
                        team_product: 'defaultteamproduct',
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

            const defaultTeamType = await app.db.models.TeamType.findOne({ where: { id: 1 } })
            const newTeam = await app.db.models.Team.create({ name: 'new-team', TeamTypeId: defaultTeamType.id })
            await newTeam.reload({
                include: [{ model: app.db.models.TeamType }]
            })

            const result = await app.billing.createSubscriptionSession(newTeam)

            result.should.have.property('line_items')
            result.line_items.should.have.length(1)
            result.line_items[0].should.have.property('price', 'starterteampprice')
            result.line_items[0].should.have.property('quantity', 1)
        })

        it('creates a session using an existing stripe customer if the team has a subscription', async function () {
            app = await setup({
                billing: {
                    stripe: {
                        key: 1234,
                        team_product: 'defaultteamproduct',
                        team_price: 'defaultteamprice'
                    }
                }
            })

            const defaultTeamType = await app.db.models.TeamType.findOne({ where: { id: 1 } })
            const newTeam = await app.db.models.Team.create({ name: 'new-team', TeamTypeId: defaultTeamType.id })
            await app.db.controllers.Subscription.createSubscription(newTeam, 'existing-subscription', 'existing-customer')
            await newTeam.reload({
                include: [{ model: app.db.models.TeamType }]
            })

            const result = await app.billing.createSubscriptionSession(newTeam)

            result.should.have.property('customer', 'existing-customer')
            result.customer_update.should.have.property('name', 'auto')
        })

        it('creates a session the specified teamType', async function () {
            app = await setup({
                billing: {
                    stripe: {
                        key: 1234,
                        team_product: 'defaultteamproduct',
                        team_price: 'defaultteamprice',
                        device_price: 'defaultdeviceprice',
                        device_product: 'defaultdeviceproduct'
                    }
                }
            })

            const defaultTeamType = await app.db.models.TeamType.findOne({ where: { id: 1 } })

            // Create a new team type with billing codes
            const newTeamType = await app.db.models.TeamType.create({
                name: 'second-team-type',
                description: 'team type description',
                active: true,
                order: 1,
                properties: {
                    instances: {
                        [app.projectType.hashid]: {
                            active: true,
                            productId: 'secondInstanceProd',
                            priceId: 'secondInstancePrice'
                        }
                    },
                    devices: {
                        productId: 'secondDeviceProd',
                        priceId: 'secondDevicePrice'
                    },
                    users: { },
                    features: { },
                    billing: {
                        productId: 'secondTeamProd',
                        priceId: 'secondTeamPrice'
                    }
                }
            })

            const newTeam = await app.db.models.Team.create({ name: 'new-team', TeamTypeId: defaultTeamType.id })

            // Create an application, instance and device
            const application = await app.factory.createApplication({ name: 'application-2' }, newTeam)
            await app.factory.createInstance(
                { name: 'project-subscription-test' },
                application,
                app.stack,
                app.template,
                app.projectType,
                { start: false }
            )
            await app.factory.createDevice({ name: 'project-sub-device-test' }, newTeam)

            const result = await app.billing.createSubscriptionSession(newTeam, null, newTeamType.hashid)

            // Check the session has picked up the billing codes from the target type, not
            // the current team type
            result.should.have.property('mode', 'subscription')
            result.should.have.property('client_reference_id', newTeam.hashid)
            result.should.have.property('metadata')
            result.metadata.should.have.property('teamTypeId', newTeamType.hashid)
            result.should.have.property('success_url', 'http://localhost:3000/team/new-team/applications?billing_session={CHECKOUT_SESSION_ID}')
            result.should.have.property('cancel_url', 'http://localhost:3000/team/new-team/applications')
            result.should.have.property('subscription_data')
            result.subscription_data.should.have.property('metadata')
            result.subscription_data.metadata.should.have.property('team', newTeam.hashid)
            result.should.have.property('line_items')
            result.line_items.should.have.length(3)
            result.line_items[0].should.have.property('price', 'secondTeamPrice')
            result.line_items[0].should.have.property('quantity', 1)
            result.line_items[1].should.have.property('price', 'secondDevicePrice')
            result.line_items[1].should.have.property('quantity', 1)
            result.line_items[2].should.have.property('price', 'secondInstancePrice')
            result.line_items[2].should.have.property('quantity', 1)
        })

        describe('with free trials', function () {
            describe('configured', function () {
                beforeEach(async function () {
                    app = await setup({
                        billing: {
                            stripe: {
                                key: 1234,
                                team_product: 'defaultteamproduct',
                                team_price: 'defaultteamprice',
                                new_customer_free_credit: 1000
                            }
                        }
                    })
                })

                it('sets the trial flag if the user is eligible for a trial', async function () {
                    const defaultTeamType = await app.db.models.TeamType.findOne({ where: { id: 1 } })
                    const newTeam = await app.db.models.Team.create({ name: 'new-team', TeamTypeId: defaultTeamType.id })
                    const user = await app.db.models.User.create({ admin: true, username: 'new', name: 'New User', email: 'new@example.com', email_verified: true, password: 'aaPassword' })
                    await newTeam.addUser(user, { through: { role: Roles.Owner } })
                    should.equal(await app.db.controllers.Subscription.userEligibleForFreeTrialCredit(user, true), true)

                    const result = await app.billing.createSubscriptionSession(newTeam, user)

                    result.should.have.property('subscription_data')
                    result.subscription_data.should.have.property('metadata')
                    result.subscription_data.metadata.should.have.property('free_trial', true)
                })

                it('sets trial flag to false if the user is not eligible for a trial', async function () {
                    const defaultTeamType = await app.db.models.TeamType.findOne({ where: { id: 1 } })
                    const secondTeam = await app.db.models.Team.create({ name: 'new-team', TeamTypeId: defaultTeamType.id })
                    const userAlice = await app.db.models.User.byEmail('alice@example.com')
                    await secondTeam.addUser(userAlice, { through: { role: Roles.Owner } })
                    should.equal(await app.db.controllers.Subscription.userEligibleForFreeTrialCredit(userAlice, true), false)

                    const result = await app.billing.createSubscriptionSession(secondTeam, userAlice)

                    result.should.have.property('subscription_data')
                    result.subscription_data.should.have.property('metadata')
                    result.subscription_data.metadata.should.have.property('free_trial', false)
                })
            })
        })

        describe('disabled', function () {
            beforeEach(async function () {
                app = await setup({
                    billing: {
                        stripe: {
                            key: 1234,
                            team_product: 'defaultteamproduct',
                            team_price: 'defaultteamprice'
                            // new_customer_free_credit - NOT enabled
                        }
                    }
                })
            })

            it('does not set trial flag even if the user is eligible for a trial', async function () {
                const defaultTeamType = await app.db.models.TeamType.findOne({ where: { id: 1 } })
                const newTeam = await app.db.models.Team.create({ name: 'new-team', TeamTypeId: defaultTeamType.id })
                const user = await app.db.models.User.create({ admin: true, username: 'new', name: 'New User', email: 'new@example.com', email_verified: true, password: 'aaPassword' })
                await newTeam.addUser(user, { through: { role: Roles.Owner } })
                should.equal(await app.db.controllers.Subscription.userEligibleForFreeTrialCredit(user, true), true)

                const result = await app.billing.createSubscriptionSession(newTeam, user)

                result.should.have.property('subscription_data')
                result.subscription_data.should.have.property('metadata')
                result.subscription_data.metadata.should.not.have.property('free_trial')
                result.subscription_data.metadata.should.not.have.property('free_trial', true)
            })
        })

        describe('billing codes', function () {
            it('creates a session with a user billing code', async function () {
                app = await setup({
                    billing: {
                        stripe: {
                            key: 1234,
                            team_product: 'defaultteamproduct',
                            team_price: 'defaultteamprice'
                        }
                    }
                })

                const defaultTeamType = await app.db.models.TeamType.findOne({ where: { id: 1 } })
                const newTeam = await app.db.models.Team.create({ name: 'new-team', TeamTypeId: defaultTeamType.id })
                const userAlice = await app.db.models.User.byEmail('alice@example.com')

                await app.billing.setUserBillingCode(userAlice, 'KNOWN_CODE')

                const result = await app.billing.createSubscriptionSession(newTeam, userAlice)

                result.should.have.property('discounts')
                result.discounts[0].should.have.property('promotion_code', 'knownCodeId')
            })
        })
    })

    describe('enableManualBilling', async function () {
        let stripe
        beforeEach(async function () {
            stripe = setup.setupStripe()
            app = await setup({
                billing: {
                    stripe: {
                        key: 1234,
                        team_product: 'defaultteamproduct',
                        team_price: 'defaultteamprice'
                    }
                }
            })
        })
        it('puts trial team into unmanaged mode', async function () {
            const team1 = await app.factory.createTeam({ name: 'UnmanagedTeam' })
            await team1.addUser(app.user, { through: { role: Roles.Owner } })
            await app.db.controllers.Subscription.createTrialSubscription(
                team1,
                Date.now() + 86400000
            )

            let sub = await team1.getSubscription()
            // Check the default states for a trial subscription are correct
            sub.isActive().should.be.false()
            sub.isUnmanaged().should.be.false()
            sub.isCanceled().should.be.false()
            sub.isPastDue().should.be.false()
            sub.isTrial().should.be.true()
            sub.isTrialEnded().should.be.false()

            await app.billing.enableManualBilling(team1)

            sub = await team1.getSubscription()
            // Check the updated states for an unmanaged subscription are correct
            sub.isActive().should.be.false()
            sub.isUnmanaged().should.be.true()
            sub.isCanceled().should.be.false()
            sub.isPastDue().should.be.false()
            sub.isTrial().should.be.false()
            sub.isTrialEnded().should.be.true()
        })
        it('puts team with subscription into unmanaged mode', async function () {
            const team1 = await app.factory.createTeam({ name: 'UnmanagedTeam2' })
            await team1.addUser(app.user, { through: { role: Roles.Owner } })
            await app.db.controllers.Subscription.createSubscription(
                team1,
                'sub_1234',
                'cus_1234'
            )

            let sub = await team1.getSubscription()
            // Check the default states for a trial subscription are correct
            sub.isActive().should.be.true()
            sub.isUnmanaged().should.be.false()
            sub.isTrial().should.be.false()
            sub.isTrialEnded().should.be.true()
            sub.subscription.should.equal('sub_1234')
            sub.customer.should.equal('cus_1234')

            await app.billing.enableManualBilling(team1)

            sub = await team1.getSubscription()
            // Check the updated states for an unmanaged subscription are correct
            sub.isActive().should.be.false()
            sub.isUnmanaged().should.be.true()
            sub.isTrial().should.be.false()
            sub.isTrialEnded().should.be.true()
            sub.subscription.should.equal('')
            sub.customer.should.equal('cus_1234')

            // Check we asked stripe to delete/cancel the subscription
            stripe.subscriptions.del.called.should.be.true()
            stripe.subscriptions.del.lastCall.args[0].should.equal('sub_1234')
        })
        it('puts team without existing subscription into unmanaged mode', async function () {
            const team1 = await app.factory.createTeam({ name: 'UnmanagedTeam2' })
            await team1.addUser(app.user, { through: { role: Roles.Owner } })

            await app.billing.enableManualBilling(team1)

            const sub = await team1.getSubscription()
            // Check the updated states for an unmanaged subscription are correct
            sub.isActive().should.be.false()
            sub.isUnmanaged().should.be.true()
            sub.isTrial().should.be.false()
            sub.isTrialEnded().should.be.true()
            sub.subscription.should.equal('')
            sub.customer.should.equal('')
        })
    })

    describe('addProject', function () {
        beforeEach(async function () {
            stripe = setup.setupStripe()
            stripe.subscriptions.create('sub_1234567890') // add existing subscription to mock stripe

            app = await setup()
        })

        it('adds a project to Stripe subscription', async function () {
            let stripeData = await stripe.subscriptions.retrieve('sub_1234567890')
            stripeData.items.data.should.have.length(0)

            await app.billing.addProject(app.team, app.project)

            stripeData = await stripe.subscriptions.retrieve('sub_1234567890')
            stripeData.items.data.should.have.length(1)
            stripeData.items.data[0].should.have.property('quantity', 1)
            stripeData.items.data[0].should.have.property('price')
            stripeData.items.data[0].price.should.have.property('id', 'price_123')
            stripeData.items.data[0].price.should.have.property('product', 'product_123')

            const args = stripe.subscriptions.update.lastCall.args
            args[0].should.equal('sub_1234567890')
            args[1].should.have.property('proration_behavior', 'always_invoice')

            // Calling again - ensure it doesn't double the quantity
            stripe.subscriptions.update.resetHistory()
            await app.billing.addProject(app.team, app.project)

            should.equal(stripe.subscriptions.update.called, false)
        })

        it('adds a project to Stripe subscription - non-default proration behaviour', async function () {
            const teamTypeProps = app.defaultTeamType.properties
            teamTypeProps.billing = { proration: 'create_prorations' }
            app.defaultTeamType.properties = teamTypeProps
            await app.defaultTeamType.save()
            await app.team.reload({ include: [app.db.models.TeamType] })

            await app.billing.addProject(app.team, app.project)

            should.equal(stripe.subscriptions.update.calledOnce, true)

            const args = stripe.subscriptions.update.lastCall.args
            args[0].should.equal('sub_1234567890')
            args[1].should.have.property('proration_behavior', 'create_prorations')

            // Calling again - ensure it doesn't double the quantity
            stripe.subscriptions.update.resetHistory()

            await app.billing.addProject(app.team, app.project)
            should.equal(stripe.subscriptions.update.called, false)
        })

        it('adds a second project to Stripe subscription with existing invoice item for project type', async function () {
            // Add first project
            await app.billing.addProject(app.team, app.project)

            const instanceTwo = await app.factory.createInstance(
                { name: 'project2' },
                app.application,
                app.stack,
                app.template,
                app.projectType,
                { start: false }
            )

            let stripeData = await stripe.subscriptions.retrieve('sub_1234567890')
            stripeData.items.data.should.have.length(1)
            stripeData.items.data[0].should.have.property('quantity', 1)
            stripeData.items.data[0].price.should.have.property('id', 'price_123')

            await app.billing.addProject(app.team, instanceTwo)

            stripeData = await stripe.subscriptions.retrieve('sub_1234567890')
            stripeData.items.data.should.have.length(1)
            stripeData.items.data[0].should.have.property('quantity', 2)
            stripeData.items.data[0].price.should.have.property('id', 'price_123')
        })

        it('accounts for free allowance', async function () {
            // Set a free allowance of 1 for this instance type
            const teamTypeProps = app.defaultTeamType.properties
            teamTypeProps.instances[app.projectType.hashid] = { active: true, free: 1 }
            app.defaultTeamType.properties = teamTypeProps
            await app.defaultTeamType.save()

            await app.team.reload({ include: [app.db.models.TeamType] })

            // Verify stripe is empty
            let stripeData = await stripe.subscriptions.retrieve('sub_1234567890')
            stripeData.items.data.should.have.length(0)

            await app.billing.addProject(app.team, app.project)

            // Should not call stripe
            should.equal(stripe.subscriptions.update.called, false)

            const instanceTwo = await app.factory.createInstance(
                { name: 'project2' },
                app.application,
                app.stack,
                app.template,
                app.projectType,
                { start: false }
            )

            await app.billing.addProject(app.team, instanceTwo)

            stripeData = await stripe.subscriptions.retrieve('sub_1234567890')
            stripeData.items.data.should.have.length(1)
            stripeData.items.data[0].should.have.property('quantity', 1)
            stripeData.items.data[0].price.should.have.property('id', 'price_123')
        })

        it('skips for teams with unmanaged subscription', async function () {
            const team1 = await app.factory.createTeam({ name: 'UnmanagedTeam' })
            await team1.addUser(app.user, { through: { role: Roles.Owner } })
            await app.db.controllers.Subscription.createTrialSubscription(
                team1,
                Date.now() + 86400000
            )
            await app.billing.enableManualBilling(team1)

            await app.billing.addProject(team1, app.project)
            // Ensure we didn't touch stripe
            should.equal(stripe.subscriptions.update.called, false)
        })
    })

    describe('removeProject', function () {
        beforeEach(async function () {
            stripe = setup.setupStripe()
            stripe.subscriptions.create('sub_1234567890') // add existing subscription to mock stripe

            app = await setup()
            // Make sure the sub contains a project to begin with
            await app.billing.addProject(app.team, app.project)
            stripe.subscriptions.update.resetHistory()
        })

        it('removes a project from a Stripe subscription with existing invoice item for project type with quantity > 1', async function () {
            const instanceTwo = await app.factory.createInstance(
                { name: 'project2' },
                app.application,
                app.stack,
                app.template,
                app.projectType,
                { start: false }
            )

            await app.billing.addProject(app.team, instanceTwo)
            stripe.subscriptions.update.resetHistory()

            let stripeData = await stripe.subscriptions.retrieve('sub_1234567890')
            stripeData.items.data.should.have.length(1)
            stripeData.items.data[0].should.have.property('quantity', 2)
            stripeData.items.data[0].should.have.property('price')
            stripeData.items.data[0].price.should.have.property('id', 'price_123')
            stripeData.items.data[0].price.should.have.property('product', 'product_123')

            // Mark the project as deleting so it gets ignored by billing
            app.project.state = 'deleting'
            await app.project.save()

            await app.billing.removeProject(app.team, app.project)

            // Verify quantity reduced to 1
            stripeData = await stripe.subscriptions.retrieve('sub_1234567890')
            stripeData.items.data.should.have.length(1)
            stripeData.items.data[0].should.have.property('quantity', 1)
        })

        it('removes a project from a Stripe subscription with existing invoice item for project type with quantity = 1', async function () {
            // Mark the project as deleting so it gets ignored by billing
            app.project.state = 'deleting'
            await app.project.save()

            await app.billing.removeProject(app.team, app.project)

            const args = stripe.subscriptions.update.lastCall.args
            args[1].items.should.have.length(1)
            args[1].items[0].should.have.property('deleted', true)
            args[1].items[0].should.have.property('price', 'price_123')

            const stripeData = await stripe.subscriptions.retrieve('sub_1234567890')
            stripeData.items.data.should.have.length(0)
        })

        it('skips removing a project from Stripe if the quanities already match', async function () {
            await app.billing.removeProject(app.team, app.project)

            should.equal(stripe.subscriptions.update.called, false)
        })

        it('accounts for free allowance', async function () {
            // Set a free allowance of 1 for this instance type
            const teamTypeProps = app.defaultTeamType.properties
            teamTypeProps.instances[app.projectType.hashid] = { active: true, free: 1 }
            app.defaultTeamType.properties = teamTypeProps
            await app.defaultTeamType.save()

            await app.team.reload({ include: [app.db.models.TeamType] })
            const sub = await app.team.getSubscription()

            // Create second
            const instanceTwo = await app.factory.createInstance(
                { name: 'project2' },
                app.application,
                app.stack,
                app.template,
                app.projectType,
                { start: false }
            )
            // Create second
            await app.factory.createInstance(
                { name: 'project3' },
                app.application,
                app.stack,
                app.template,
                app.projectType,
                { start: false }
            )

            let stripeData = await stripe.subscriptions.retrieve(sub.subscription)
            stripeData.items.data[0].should.have.property('quantity', 1)

            await app.billing.addProject(app.team, instanceTwo)

            stripeData = await stripe.subscriptions.retrieve(sub.subscription)
            stripeData.items.data[0].should.have.property('quantity', 2)

            // Mark the project as deleting so it gets ignored by billing
            app.project.state = 'deleting'
            await app.project.save()

            await app.billing.removeProject(app.team, app.project)

            stripeData = await stripe.subscriptions.retrieve(sub.subscription)
            stripeData.items.data[0].should.have.property('quantity', 1)
        })

        it('skips for teams with unmanaged subscription', async function () {
            const team1 = await app.factory.createTeam({ name: 'UnmanagedTeam' })
            await team1.addUser(app.user, { through: { role: Roles.Owner } })
            await app.db.controllers.Subscription.createTrialSubscription(
                team1,
                Date.now() + 86400000
            )
            await app.billing.enableManualBilling(team1)

            await app.billing.removeProject(team1, app.project)
            // Ensure we didn't touch stripe
            should.equal(stripe.subscriptions.update.called, false)
        })
    })

    describe('updateTeamBillingCounts', async function () {
        describe('unmanaged subscription', async function () {
            beforeEach(async function () {
                stripe = setup.setupStripe()
                stripe.subscriptions.create('sub_1234567890') // add existing subscription to mock stripe
                app = await setup({
                    billing: {
                        stripe: {
                            key: 1234,
                            team_product: 'defaultteamproduct',
                            team_price: 'defaultteamprice'
                        }
                    }
                })
            })
            it('skips for teams with unmanaged subscription', async function () {
                const team1 = await app.factory.createTeam({ name: 'UnmanagedTeam' })
                await team1.addUser(app.user, { through: { role: Roles.Owner } })
                await app.db.controllers.Subscription.createTrialSubscription(
                    team1,
                    Date.now() + 86400000
                )
                await app.billing.enableManualBilling(team1)

                await app.billing.updateTeamBillingCounts(team1)
                // Ensure we didn't touch stripe
                should.equal(stripe.subscriptions.retrieve.called, false)
                should.equal(stripe.subscriptions.update.called, false)
            })
        })
        describe('no existing subscription item', async function () {
            beforeEach(async function () {
                stripe = setup.setupStripe()
            })
            it('does not add team device item when billable count is 0', async function () {
                // app.team has no devices
                app = await setup({
                    billing: {
                        stripe: {
                            key: 1234,
                            team_product: 'defaultteamproduct',
                            team_price: 'defaultteamprice',
                            device_product: 'defaultdeviceproduct',
                            device_price: 'defaultdeviceprice'
                        }
                    }
                })

                let stripeData = await stripe.subscriptions.retrieve('sub_1234567890')
                stripeData.items.data.should.have.length(0)

                await app.billing.updateTeamBillingCounts(app.team)

                stripeData = await stripe.subscriptions.retrieve('sub_1234567890')
                stripeData.items.data.should.have.length(1)
                stripeData.items.data[0].should.have.property('quantity', 1)
                stripeData.items.data[0].should.have.property('price')
                stripeData.items.data[0].price.should.have.property('id', 'price_123')
            })
            it('adds team device item when billable count is > 0', async function () {
                // Using `starterteamprod` which has a quantity of 27
                app = await setup({
                    billing: {
                        stripe: {
                            key: 1234,
                            team_product: 'defaultteamproduct',
                            team_price: 'defaultteamprice',
                            device_product: 'defaultdeviceproduct',
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

                let stripeData = await stripe.subscriptions.retrieve('sub_1234567890')
                stripeData.items.data.should.have.length(0)

                await app.billing.updateTeamBillingCounts(app.team)

                stripeData = await stripe.subscriptions.retrieve('sub_1234567890')
                stripeData.items.data.should.have.length(2)
                stripeData.items.data[0].should.have.property('quantity', 1)
                stripeData.items.data[0].should.have.property('price')
                stripeData.items.data[0].price.should.have.property('id', 'price_123')
                stripeData.items.data[1].should.have.property('quantity', 1)
                stripeData.items.data[1].should.have.property('price')
                stripeData.items.data[1].price.should.have.property('id', 'defaultdeviceprice')
            })
        })
        describe('existing subscription item', async function () {
            beforeEach(async function () {
                stripe = setup.setupStripe()
            })
            it('updates device count to 0', async function () {
                // app.team has no devices
                app = await setup({
                    billing: {
                        stripe: {
                            key: 1234,
                            team_product: 'defaultteamproduct',
                            team_price: 'defaultteamprice',
                            device_product: 'defaultdeviceproduct',
                            device_price: 'defaultdeviceprice'
                        }
                    }
                })
                await stripe.subscriptions.create('sub_1234567890') // add existing subscription to mock stripe
                // Add an existing stripe item for devices, quantity 27
                await stripe.subscriptions.update('sub_1234567890', { items: [{ quantity: 27, price: 'defaultdeviceprice' }] })

                let stripeData = await stripe.subscriptions.retrieve('sub_1234567890')
                stripeData.items.data.should.have.length(1)
                stripeData.items.data[0].price.should.have.property('id', 'defaultdeviceprice')
                stripeData.items.data[0].should.have.property('quantity', 27)

                // This should remove the device item and add the missing instance item
                await app.billing.updateTeamBillingCounts(app.team)

                stripeData = await stripe.subscriptions.retrieve('sub_1234567890')
                stripeData.items.data.should.have.length(1)
                stripeData.items.data[0].price.should.have.property('id', 'price_123')
                stripeData.items.data[0].should.have.property('quantity', 1)
            })
            it('updates device count to 1', async function () {
                // app.team has no devices
                app = await setup({
                    billing: {
                        stripe: {
                            key: 1234,
                            team_product: 'defaultteamproduct',
                            team_price: 'defaultteamprice',
                            device_product: 'defaultdeviceproduct',
                            device_price: 'defaultdeviceprice'
                        }
                    }
                })

                await stripe.subscriptions.create('sub_1234567890') // add existing subscription to mock stripe
                // Add an existing stripe item for devices, quantity 27
                await stripe.subscriptions.update('sub_1234567890', { items: [{ quantity: 27, price: 'defaultdeviceprice' }] })

                const device = await app.db.models.Device.create({ name: 'd1', type: 'd1', credentialSecret: '' })
                await app.team.addDevice(device)

                // This should update the device item and add the missing instance item
                await app.billing.updateTeamBillingCounts(app.team)

                const stripeData = await stripe.subscriptions.retrieve('sub_1234567890')
                stripeData.items.data.should.have.length(2)
                stripeData.items.data[0].price.should.have.property('id', 'defaultdeviceprice')
                stripeData.items.data[0].should.have.property('quantity', 1)
                stripeData.items.data[1].price.should.have.property('id', 'price_123')
                stripeData.items.data[1].should.have.property('quantity', 1)
            })
            it('includes free allocation when calculating billable device count', async function () {
                // app.team has no devices
                app = await setup({
                    billing: {
                        stripe: {
                            key: 1234,
                            team_product: 'defaultteamproduct',
                            team_price: 'defaultteamprice',
                            device_product: 'defaultdeviceproduct',
                            device_price: 'defaultdeviceprice'
                        }
                    }
                })

                await stripe.subscriptions.create('sub_1234567890') // add existing subscription to mock stripe
                // Add an existing stripe item for devices, quantity 27
                await stripe.subscriptions.update('sub_1234567890', { items: [{ quantity: 27, price: 'defaultdeviceprice' }] })

                const teamType = await app.db.models.TeamType.byName('starter')
                const properties = teamType.properties
                properties.devices = { free: 2 }
                teamType.properties = properties
                await teamType.save()
                await app.team.reload({
                    include: [{ model: app.db.models.TeamType }]
                })

                const device = await app.db.models.Device.create({ name: 'd1', type: 'd1', credentialSecret: '' })
                await app.team.addDevice(device)

                // With a free allocation of 2, this first call should see the
                // count get changed from the starting point of 27 (setup in beforeEach)
                // back to 0 - even though there is a device in the team.
                await app.billing.updateTeamBillingCounts(app.team)

                let stripeData = await stripe.subscriptions.retrieve('sub_1234567890')
                stripeData.items.data.should.have.length(1)
                stripeData.items.data[0].price.should.have.property('id', 'price_123')
                stripeData.items.data[0].should.have.property('quantity', 1)

                stripe.subscriptions.update.resetHistory()
                // Add a second device - still within free allocation
                const device2 = await app.db.models.Device.create({ name: 'd2', type: 'd1', credentialSecret: '' })
                await app.team.addDevice(device2)
                // No update should get made as we're still inside free allocation
                await app.billing.updateTeamBillingCounts(app.team)

                should.equal(stripe.subscriptions.update.called, false)

                // Add a third device - exceeds free allocation
                const device3 = await app.db.models.Device.create({ name: 'd3', type: 'd1', credentialSecret: '' })
                await app.team.addDevice(device3)
                // Should update billing to 1 (3 devices, 2 are free)
                await app.billing.updateTeamBillingCounts(app.team)

                stripeData = await stripe.subscriptions.retrieve('sub_1234567890')
                stripeData.items.data.should.have.length(2)
                stripeData.items.data[0].price.should.have.property('id', 'price_123')
                stripeData.items.data[0].should.have.property('quantity', 1)
                stripeData.items.data[1].price.should.have.property('id', 'defaultdeviceprice')
                stripeData.items.data[1].should.have.property('quantity', 1)
            })
        })
    })

    describe('delete team', async function () {
        let stripe
        beforeEach(async function () {
            stripe = setup.setupStripe()
            app = await setup({
                billing: {
                    stripe: {
                        key: 1234,
                        team_product: 'defaultteamproduct',
                        team_price: 'defaultteamprice'
                    }
                }
            })
        })
        it('cancels team subscription when the team is deleted', async function () {
            const team1 = await app.factory.createTeam({ name: 'DeletableTeam' })
            await team1.addUser(app.user, { through: { role: Roles.Owner } })
            await app.db.controllers.Subscription.createSubscription(
                team1,
                'sub_1234',
                'cus_1234'
            )
            const teamSub = await team1.getSubscription()

            stripe.subscriptions.del.called.should.be.false()

            // Delete the team
            await team1.destroy()

            // Check we asked stripe to delete/cancel the subscription
            stripe.subscriptions.del.called.should.be.true()
            stripe.subscriptions.del.lastCall.args[0].should.equal('sub_1234')

            const checkSub = await app.db.models.Subscription.findOne({ where: { id: teamSub.id } })
            // Careful using raw sequelize objects and should.js
            // Cannot use `should.not.exist(checkSub)` as it causes a hang
            ;(checkSub === null).should.be.true('Subscription should not exist')
        })
    })

    describe('updateTeamType', async function () {
        let stripe
        beforeEach(async function () {
            stripe = setup.setupStripe()
        })
        it('updates billing when changing team type', async function () {
            app = await setup({
                billing: {
                    stripe: {
                        key: 1234,
                        team_product: 'defaultteamproduct',
                        team_price: 'defaultteamprice',
                        device_price: 'defaultdeviceprice',
                        device_product: 'defaultdeviceproduct'
                    }
                }
            })

            const defaultTeamType = await app.db.models.TeamType.findOne({ where: { id: 1 } })

            // Create a new team type with billing codes
            const newTeamType = await app.db.models.TeamType.create({
                name: 'second-team-type',
                description: 'team type description',
                active: true,
                order: 1,
                properties: {
                    instances: {
                        [app.projectType.hashid]: {
                            active: true,
                            productId: 'secondInstanceProd',
                            priceId: 'secondInstancePrice'
                        }
                    },
                    devices: {
                        productId: 'secondDeviceProd',
                        priceId: 'secondDevicePrice'
                    },
                    users: { },
                    features: { },
                    billing: {
                        productId: 'secondTeamProd',
                        priceId: 'secondTeamPrice'
                    }
                }
            })

            // Create a team using the default team type
            const newTeam = await app.db.models.Team.create({ name: 'new-team', TeamTypeId: defaultTeamType.id })
            await app.db.controllers.Subscription.createSubscription(newTeam, 'sub_999', 'existing-customer')

            // Create an application, instance and device
            const application = await app.factory.createApplication({ name: 'application-2' }, newTeam)
            await app.factory.createInstance(
                { name: 'project-subscription-test' },
                application,
                app.stack,
                app.template,
                app.projectType,
                { start: false }
            )
            await app.factory.createDevice({ name: 'project-sub-device-test' }, newTeam)

            // Populate the stripe subscription with existing team type details
            stripe.subscriptions.create('sub_999') // add existing subscription to mock stripe
            stripe.subscriptions.update('sub_999', {
                items: [
                    { price: 'originalTeamPlan', quantity: 1 },
                    { price: 'price_123', quantity: 1 },
                    { price: 'defaultdeviceprice', quantity: 1 }
                ]
            })

            // Update the team type
            await newTeam.updateTeamType(newTeamType)

            // Check the subscription has been updated with the new team type billing prices
            const stripeData = await stripe.subscriptions.retrieve('sub_999')
            stripeData.items.data.should.have.length(3)
            stripeData.items.data[0].should.have.property('quantity', 1)
            stripeData.items.data[0].price.should.have.property('id', 'secondTeamPrice')
            stripeData.items.data[1].should.have.property('quantity', 1)
            stripeData.items.data[1].price.should.have.property('id', 'secondInstancePrice')
            stripeData.items.data[2].should.have.property('quantity', 1)
            stripeData.items.data[2].price.should.have.property('id', 'secondDevicePrice')
        })
    })
})
