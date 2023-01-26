const should = require('should')
const sinon = require('sinon')
const setup = require('../../setup')
const FF_UTIL = require('flowforge-test-utils')
const { Roles } = FF_UTIL.require('forge/lib/roles')

describe('Billing routes', function () {
    const sandbox = sinon.createSandbox()

    let app
    let stripe
    const TestObjects = {}

    async function getLog () {
        const logs = await app.db.models.AuditLog.forEntity()
        return (await app.db.views.AuditLog.auditLog({ log: logs.log })).log[0]
    }

    function setupStripe (mock) {
        require.cache[require.resolve('stripe')] = {
            exports: function (apiKey) {
                return mock
            }
        }
        stripe = mock
    }

    async function login (username, password) {
        const response = await app.inject({
            method: 'POST',
            url: '/account/login',
            payload: { username, password, remember: false }
        })
        response.cookies.should.have.length(1)
        response.cookies[0].should.have.property('name', 'sid')
        TestObjects.tokens[username] = response.cookies[0].value
    }

    beforeEach(async function () {
        // TODO: we don't currently verify what gets passed to stripe is correct
        setupStripe({
            customers: {
                createBalanceTransaction: sinon.stub().resolves({ status: 'ok' })
            },
            subscriptions: {
                retrieve: sinon.stub().resolves({ items: { data: [] } }),
                update: sinon.stub().resolves(true)
            },
            subscriptionItems: {
                update: sinon.stub().resolves(true)
            }
        })

        app = await setup()
        TestObjects.tokens = {}

        TestObjects.alice = app.user
        TestObjects.ATeam = app.team
        TestObjects.projectType1 = app.projectType
        TestObjects.template1 = app.template
        TestObjects.stack1 = app.stack

        await login('alice', 'aaPassword')

        sandbox.stub(app.log, 'info')
        sandbox.stub(app.log, 'warn')
        sandbox.stub(app.log, 'error')
    })

    afterEach(async function () {
        await app.close()
        delete require.cache[require.resolve('stripe')]
        sandbox.restore()
    })

    describe('Stripe Callbacks', function () {
        const callbackURL = '/ee/billing/callback'

        beforeEach(async function () {
            sandbox.stub(app.billing)
        })

        describe('charge.failed', () => {
            it('Handles known customer', async function () {
                const response = await app.inject({
                    method: 'POST',
                    url: callbackURL,
                    headers: {
                        'content-type': 'application/json'
                    },
                    payload: {
                        id: 'evt_123456790',
                        object: 'event',
                        data: {
                            object: {
                                id: 'ch_1234567890',
                                customer: 'cus_1234567890'
                            }
                        },
                        type: 'charge.failed'
                    }
                })

                should(app.log.info.called).equal(true)
                app.log.info.lastCall.firstArg.should.equal(`Stripe charge.failed event ch_1234567890 from cus_1234567890 received for team '${app.team.hashid}'`)

                should(response).have.property('statusCode', 200)
            })

            it('Logs and does not throw an error for unknown customer', async function () {
                const response = await app.inject({
                    method: 'POST',
                    url: callbackURL,
                    headers: {
                        'content-type': 'application/json'
                    },
                    payload: {
                        id: 'evt_123456790',
                        object: 'event',
                        data: {
                            object: {
                                id: 'ch_1234567890',
                                customer: 'cus_does_not_exist'
                            }
                        },
                        type: 'charge.failed'
                    }
                })

                should(app.log.error.called).equal(true)
                app.log.error.lastCall.firstArg.should.equal('Stripe charge.failed event ch_1234567890 from cus_does_not_exist received for unknown team by Stripe Customer ID')

                should(response).have.property('statusCode', 200)
            })
        })

        describe('checkout.session.completed', () => {
            it('Creates a subscription locally', async function () {
                const response = await (app.inject({
                    method: 'POST',
                    url: callbackURL,
                    headers: {
                        'content-type': 'application/json'
                    },
                    payload: {
                        id: 'evt_123456790',
                        object: 'event',
                        data: {
                            object: {
                                id: 'cs_1234567890',
                                object: 'checkout.session',
                                customer: 'cus_0987654321',
                                subscription: 'sub_0987654321',
                                client_reference_id: app.team.hashid
                            }
                        },
                        type: 'checkout.session.completed'
                    }
                }))
                should(app.log.info.called).equal(true)
                app.log.info.firstCall.firstArg.should.equal(`Stripe checkout.session.completed event cs_1234567890 from cus_0987654321 received for team '${app.team.hashid}'`)

                should(response).have.property('statusCode', 200)
                const sub = await app.db.models.Subscription.byCustomerId('cus_0987654321')
                should(sub.customer).equal('cus_0987654321')
                should(sub.subscription).equal('sub_0987654321')
                const team = sub.Team
                should(team.name).equal('ATeam')
            })

            it('Warns but still returns 200 if the team can not be found', async function () {
                const response = await (app.inject({
                    method: 'POST',
                    url: callbackURL,
                    headers: {
                        'content-type': 'application/json'
                    },
                    payload: {
                        id: 'evt_123456790',
                        object: 'event',
                        data: {
                            object: {
                                id: 'cs_1234567890',
                                object: 'checkout.session',
                                customer: 'cus_0987654321',
                                subscription: 'sub_0987654321',
                                client_reference_id: 'unknown_team_id'
                            }
                        },
                        type: 'checkout.session.completed'
                    }
                }))

                should(app.log.error.called).equal(true)
                app.log.error.firstCall.firstArg.should.equal("Stripe checkout.session.completed event cs_1234567890 from cus_0987654321 received for unknown team by team ID 'unknown_team_id'")

                should(response).have.property('statusCode', 200)
            })
        })

        describe('checkout.session.expired', () => {
            it('Logs and does not throw an error', async () => {
                const response = await (app.inject({
                    method: 'POST',
                    url: callbackURL,
                    headers: {
                        'content-type': 'application/json'
                    },
                    payload: {
                        id: 'evt_123456790',
                        object: 'event',
                        data: {
                            object: {
                                id: 'cs_1234567890',
                                object: 'checkout.session',
                                customer: 'cus_1234567890',
                                subscription: 'sub_0987654321',
                                status: 'expired'
                            }
                        },
                        type: 'checkout.session.expired'
                    }
                }))

                should(app.log.info.called).equal(true)
                app.log.info.firstCall.firstArg.should.equal(`Stripe checkout.session.expired event cs_1234567890 from cus_1234567890 received for team '${app.team.hashid}'`)

                should(response).have.property('statusCode', 200)
            })
        })

        describe('customer.subscription.created', () => {
            it('Logs known subscriptions', async () => {
                const response = await (app.inject({
                    method: 'POST',
                    url: callbackURL,
                    headers: {
                        'content-type': 'application/json'
                    },
                    payload: {
                        id: 'evt_123456790',
                        object: 'event',
                        data: {
                            object: {
                                id: 'sub_1234567890',
                                object: 'subscription',
                                customer: 'cus_1234567890',
                                status: 'active'
                            }
                        },
                        type: 'customer.subscription.created'
                    }
                }))

                should(app.log.info.called).equal(true)
                app.log.info.firstCall.firstArg.should.equal(`Stripe customer.subscription.created event sub_1234567890 from cus_1234567890 received for team '${app.team.hashid}'`)

                should(response).have.property('statusCode', 200)
            })

            it('Logs events for unknown customers', async () => {
                const response = await (app.inject({
                    method: 'POST',
                    url: callbackURL,
                    headers: {
                        'content-type': 'application/json'
                    },
                    payload: {
                        id: 'evt_123456790',
                        object: 'event',
                        data: {
                            object: {
                                id: 'sub_unknown',
                                object: 'subscription',
                                customer: 'cus_unknown',
                                status: 'active'
                            }
                        },
                        type: 'customer.subscription.created'
                    }
                }))

                should(app.log.error.called).equal(true)
                app.log.error.firstCall.firstArg.should.equal('Stripe customer.subscription.created event sub_unknown from cus_unknown received for unknown team by Stripe Customer ID')

                should(response).have.property('statusCode', 200)
            })

            it('Creates a stripe credit balance against the customer if the free_trial flag is set', async () => {
                const response = await (app.inject({
                    method: 'POST',
                    url: callbackURL,
                    headers: {
                        'content-type': 'application/json'
                    },
                    payload: {
                        id: 'evt_123456790',
                        object: 'event',
                        data: {
                            object: {
                                id: 'sub_1234567890',
                                object: 'subscription',
                                customer: 'cus_1234567890',
                                status: 'active',
                                metadata: {
                                    free_trial: true
                                }
                            }
                        },
                        type: 'customer.subscription.created'
                    }
                }))

                should.equal(stripe.customers.createBalanceTransaction.calledOnce, true)

                stripe.customers.createBalanceTransaction.lastCall.args[0].should.equal('cus_1234567890')
                stripe.customers.createBalanceTransaction.lastCall.args[1].should.deepEqual({
                    amount: -1000,
                    currency: 'usd'
                })

                should(response).have.property('statusCode', 200)
            })

            it('Ignores the free_trial flag if trials are not enabled', async () => {
                app.config.billing.stripe.new_customer_free_credit = undefined

                const response = await (app.inject({
                    method: 'POST',
                    url: callbackURL,
                    headers: {
                        'content-type': 'application/json'
                    },
                    payload: {
                        id: 'evt_123456790',
                        object: 'event',
                        data: {
                            object: {
                                id: 'sub_1234567890',
                                object: 'subscription',
                                customer: 'cus_1234567890',
                                status: 'active',
                                metadata: {
                                    free_trial: true
                                }
                            }
                        },
                        type: 'customer.subscription.created'
                    }
                }))

                should.equal(stripe.customers.createBalanceTransaction.calledOnce, false)

                should(app.log.error.called).equal(true)
                app.log.error.firstCall.firstArg.should.equal(`Received a new subscription with the trial flag set for ${app.team.hashid}, but trials are not configured.`)

                should(response).have.property('statusCode', 200)
            })
        })

        describe('customer.subscription.updated', () => {
            it('Updates existing subscription status if it changes', async () => {
                const response = await (app.inject({
                    method: 'POST',
                    url: callbackURL,
                    headers: {
                        'content-type': 'application/json'
                    },
                    payload: {
                        id: 'evt_1MEUqIJ6VWAujNoLDtlTRH3f',
                        object: 'event',
                        data: {
                            object: {
                                id: 'sub_1234567890',
                                object: 'subscription',
                                customer: 'cus_1234567890',
                                status: 'canceled'
                            },
                            previous_attributes: {
                                status: 'active'
                            }
                        },
                        type: 'customer.subscription.updated'
                    }
                }))
                should(app.log.info.called).equal(true)
                app.log.info.firstCall.firstArg.should.equal(`Stripe customer.subscription.updated event sub_1234567890 from cus_1234567890 received for team '${app.team.hashid}'`)

                should(response).have.property('statusCode', 200)

                const subscription = await app.db.models.Subscription.byCustomerId('cus_1234567890')
                should(subscription.status).equal(app.db.models.Subscription.STATUS.CANCELED)
                const log = await getLog()
                log.event.should.equal('billing.subscription.updated')
                log.body.updates.should.have.length(1)
                log.body.updates[0].key.should.equal('status')
                log.body.updates[0].old.should.equal('active')
                log.body.updates[0].new.should.equal('canceled')
            })

            it('Ignores changes to unhandled statuses', async () => {
                const response = await (app.inject({
                    method: 'POST',
                    url: callbackURL,
                    headers: {
                        'content-type': 'application/json'
                    },
                    payload: {
                        id: 'evt_1MEUqIJ6VWAujNoLDtlTRH3f',
                        object: 'event',
                        data: {
                            object: {
                                id: 'sub_1234567890',
                                object: 'subscription',
                                customer: 'cus_1234567890',
                                status: 'past_due'
                            },
                            previous_attributes: {
                                status: 'active'
                            }
                        },
                        type: 'customer.subscription.updated'
                    }
                }))

                should(app.log.warn.called).equal(true)
                app.log.warn.firstCall.firstArg.should.equal("Stripe subscription sub_1234567890 has transitioned in Stripe to a state not currently handled: 'past_due'")

                should(response).have.property('statusCode', 200)

                const subscription = await app.db.models.Subscription.byCustomerId('cus_1234567890')
                should(subscription.status).equal(app.db.models.Subscription.STATUS.ACTIVE)
            })

            it('Logs updates events to unknown subscriptions or customers without error', async () => {
                const response = await (app.inject({
                    method: 'POST',
                    url: callbackURL,
                    headers: {
                        'content-type': 'application/json'
                    },
                    payload: {
                        id: 'evt_1MEUqIJ6VWAujNoLDtlTRH3f',
                        object: 'event',
                        data: {
                            object: {
                                id: 'sub_unknown',
                                object: 'subscription',
                                customer: 'cus_unknown',
                                status: 'canceled'
                            },
                            previous_attributes: {
                                status: 'active'
                            }
                        },
                        type: 'customer.subscription.updated'
                    }
                }))

                should(app.log.error.called).equal(true)
                app.log.error.firstCall.firstArg.should.equal('Stripe customer.subscription.updated event sub_unknown from cus_unknown received for unknown team by Stripe Customer ID')

                should(response).have.property('statusCode', 200)

                const subscription = await app.db.models.Subscription.byCustomerId('cus_1234567890')
                should(subscription.status).equal(app.db.models.Subscription.STATUS.ACTIVE) // no change
            })
        })

        describe('customer.subscription.deleted', () => {
            it('Cancels the teams subscription and stops all running projects', async () => {
                const project1 = await app.db.models.Project.create({ name: 'project-1', type: '', url: '' })
                await project1.setProjectStack(app.stack)
                await app.team.addProject(project1)

                const project2 = await app.db.models.Project.create({ name: 'project-2', type: '', url: '' })
                await project2.setProjectStack(app.stack)
                await app.team.addProject(project2)

                const project3 = await app.db.models.Project.create({ name: 'project-3', type: '', url: '' })
                await project3.setProjectStack(app.stack)
                await app.team.addProject(project3)

                // Ensure the team prop is loaded properly - wrapper assumes project.Team is defined
                await project1.reload({
                    include: [
                        { model: app.db.models.Team },
                        { model: app.db.models.ProjectStack }
                    ]
                })
                await project2.reload({
                    include: [
                        { model: app.db.models.Team },
                        { model: app.db.models.ProjectStack }
                    ]
                })
                await project3.reload({
                    include: [
                        { model: app.db.models.Team },
                        { model: app.db.models.ProjectStack }
                    ]
                })

                // project 1 & 2 are running
                await app.containers.start(project1)
                await app.containers.start(project2)

                // project3 is suspended
                await app.containers.start(project3)
                await app.containers.stop(project3)

                // Assert state before
                const teamProjects = await app.db.models.Project.byTeam(app.team.hashid)
                should(teamProjects.length).equal(3)
                const projectsStatesBefore = await app.db.models.Project.byTeam(app.team.hashid)
                projectsStatesBefore.map((project) => project.state).should.match(['running', 'running', 'suspended'])

                app.log.info.resetHistory()

                const response = await (app.inject({
                    method: 'POST',
                    url: callbackURL,
                    headers: {
                        'content-type': 'application/json'
                    },
                    payload: {
                        id: 'evt_1MEVSfJ6VWAujNoLCPdYq9kn',
                        object: 'event',
                        data: {
                            object: {
                                id: 'sub_1234567890',
                                object: 'subscription',
                                customer: 'cus_1234567890',
                                status: 'canceled'
                            }
                        },
                        type: 'customer.subscription.deleted'
                    }
                }))

                should(app.log.info.called).equal(true)
                app.log.info.firstCall.firstArg.should.equal(`Stripe customer.subscription.deleted event sub_1234567890 from cus_1234567890 received for team '${app.team.hashid}'`)

                should(response).have.property('statusCode', 200)

                const subscription = await app.db.models.Subscription.byCustomerId('cus_1234567890')
                should(subscription.status).equal(app.db.models.Subscription.STATUS.CANCELED)

                const projectsStatesAfter = await app.db.models.Project.byTeam(app.team.hashid)
                projectsStatesAfter.map((project) => project.state).should.match(['suspended', 'suspended', 'suspended'])

                const log = await getLog()
                log.event.should.equal('billing.subscription.updated')
                log.body.updates.should.have.length(1)
                log.body.updates[0].key.should.equal('status')
                log.body.updates[0].old.should.equal('active')
                log.body.updates[0].new.should.equal('canceled')
            })

            it('Handles cancellation for unknown customers', async () => {
                const response = await (app.inject({
                    method: 'POST',
                    url: callbackURL,
                    headers: {
                        'content-type': 'application/json'
                    },
                    payload: {
                        id: 'evt_1MEVSfJ6VWAujNoLCPdYq9kn',
                        object: 'event',
                        data: {
                            object: {
                                id: 'sub_1234567890',
                                object: 'subscription',
                                customer: 'cus_unknown',
                                status: 'canceled'
                            }
                        },
                        type: 'customer.subscription.deleted'
                    }
                }))

                should(app.log.error.called).equal(true)
                app.log.error.firstCall.firstArg.should.equal('Stripe customer.subscription.deleted event sub_1234567890 from cus_unknown received for unknown team by Stripe Customer ID')

                should(response).have.property('statusCode', 200)
            })

            it('Handles cancellation for unknown subscriptions without error', async () => {
                await app.db.controllers.Subscription.deleteSubscription(app.team)

                const response = await (app.inject({
                    method: 'POST',
                    url: callbackURL,
                    headers: {
                        'content-type': 'application/json'
                    },
                    payload: {
                        id: 'evt_1MEVSfJ6VWAujNoLCPdYq9kn',
                        object: 'event',
                        data: {
                            object: {
                                id: 'sub_1234567890',
                                object: 'subscription',
                                customer: 'cus_1234567890',
                                status: 'canceled'
                            }
                        },
                        type: 'customer.subscription.deleted'
                    }
                }))

                should(app.log.error.called).equal(true)
                app.log.error.firstCall.firstArg.should.equal('Stripe customer.subscription.deleted event sub_1234567890 from cus_1234567890 received for unknown team by Stripe Customer ID')

                should(response).have.property('statusCode', 200)
            })

            it('Handles cancellation for unknown teams but with a subscription (team manually deleted)', async () => {
                await app.team.destroy()

                const response = await (app.inject({
                    method: 'POST',
                    url: callbackURL,
                    headers: {
                        'content-type': 'application/json'
                    },
                    payload: {
                        id: 'evt_1MEVSfJ6VWAujNoLCPdYq9kn',
                        object: 'event',
                        data: {
                            object: {
                                id: 'sub_1234567890',
                                object: 'subscription',
                                customer: 'cus_1234567890',
                                status: 'canceled'
                            }
                        },
                        type: 'customer.subscription.deleted'
                    }
                }))

                should(app.log.warn.called).equal(true)
                app.log.warn.firstCall.firstArg.should.equal('Stripe customer.subscription.deleted event sub_1234567890 from cus_1234567890 received for deleted team with orphaned subscription')

                should(response).have.property('statusCode', 200)
            })
        })
    })

    describe('Create Project', function () {
        it('Fails to create project if billing is not setup', async function () {
            const noBillingTeam = await app.db.models.Team.create({ name: 'noBillingTeam', TeamTypeId: app.defaultTeamType.id })
            await noBillingTeam.addUser(TestObjects.alice, { through: { role: Roles.Owner } })

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/projects',
                payload: {
                    name: 'billing-project',
                    team: noBillingTeam.hashid,
                    projectType: TestObjects.projectType1.hashid,
                    template: TestObjects.template1.hashid,
                    stack: TestObjects.stack1.hashid
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(402)
            const result = response.json()
            result.should.have.property('code', 'billing_required')
        })

        it('Create project with billing setup', async function () {
            // TestObjects.ATeam already has a subscription created via ../../setup
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/projects',
                payload: {
                    name: 'test-project',
                    team: TestObjects.ATeam.hashid,
                    projectType: TestObjects.projectType1.hashid,
                    template: TestObjects.template1.hashid,
                    stack: TestObjects.stack1.hashid
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)
        })
        describe('Trial Mode', function () {
            it('Fails to create project for trial-mode team if project-type not allowed', async function () {
                app.settings.set('user:team:trial-mode', true)
                app.settings.set('user:team:trial-mode:duration', 5)
                app.settings.set('user:team:trial-mode:projectType', TestObjects.projectType1.hashid)

                // Create trial team
                const trialTeam = await app.db.models.Team.create({ name: 'noBillingTeam', TeamTypeId: app.defaultTeamType.id, trialEndsAt: Date.now() + 86400000 })
                await trialTeam.addUser(TestObjects.alice, { through: { role: Roles.Owner } })

                // Create a forbidden second projectType
                const projectType2 = await app.db.models.ProjectType.create({
                    name: 'projectType2',
                    description: 'second project type',
                    active: true,
                    properties: { foo: 'bar' },
                    order: 1
                })
                // Give the type a stack
                const stack2 = await app.db.models.ProjectStack.create({ name: 'stack2', active: true, properties: { nodered: '2.2.2' } })
                await stack2.setProjectType(projectType2)

                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/projects',
                    payload: {
                        name: 'billing-project',
                        team: trialTeam.hashid,
                        projectType: projectType2.hashid,
                        template: TestObjects.template1.hashid,
                        stack: stack2.hashid
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(402)
                const result = response.json()
                result.should.have.property('code', 'billing_required')
            })
            it('Fails to create project for trial-mode team if trial has expired', async function () {
                app.settings.set('user:team:trial-mode', true)
                app.settings.set('user:team:trial-mode:duration', 5)
                app.settings.set('user:team:trial-mode:projectType', TestObjects.projectType1.hashid)

                // Create trial team - trialEndsAt in the past
                const trialTeam = await app.db.models.Team.create({ name: 'noBillingTeam', TeamTypeId: app.defaultTeamType.id, trialEndsAt: Date.now() - 86400000 })
                await trialTeam.addUser(TestObjects.alice, { through: { role: Roles.Owner } })

                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/projects',
                    payload: {
                        name: 'billing-project',
                        team: trialTeam.hashid,
                        projectType: TestObjects.projectType1.hashid,
                        template: TestObjects.template1.hashid,
                        stack: TestObjects.stack1.hashid
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(402)
                const result = response.json()
                result.should.have.property('code', 'billing_required')
            })

            it('Creates a project for trial-mode team', async function () {
                app.settings.set('user:team:trial-mode', true)
                app.settings.set('user:team:trial-mode:duration', 5)
                app.settings.set('user:team:trial-mode:projectType', TestObjects.projectType1.hashid)

                // Create trial team
                const trialTeam = await app.db.models.Team.create({ name: 'noBillingTeam', TeamTypeId: app.defaultTeamType.id, trialEndsAt: Date.now() + 86400000 })
                await trialTeam.addUser(TestObjects.alice, { through: { role: Roles.Owner } })

                // Create project using the permitted projectType for trials - projectType1
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/projects',
                    payload: {
                        name: 'billing-project',
                        team: trialTeam.hashid,
                        projectType: TestObjects.projectType1.hashid,
                        template: TestObjects.template1.hashid,
                        stack: TestObjects.stack1.hashid
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(200)
            })

            it('Cannot create more than one trial project for trial-mode team', async function () {
                app.settings.set('user:team:trial-mode', true)
                app.settings.set('user:team:trial-mode:duration', 5)
                app.settings.set('user:team:trial-mode:projectType', TestObjects.projectType1.hashid)

                // Create trial team
                const trialTeam = await app.db.models.Team.create({ name: 'noBillingTeam', TeamTypeId: app.defaultTeamType.id, trialEndsAt: Date.now() + 86400000 })
                await trialTeam.addUser(TestObjects.alice, { through: { role: Roles.Owner } })

                // Create project using the permitted projectType for trials - projectType1
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/projects',
                    payload: {
                        name: 'billing-project',
                        team: trialTeam.hashid,
                        projectType: TestObjects.projectType1.hashid,
                        template: TestObjects.template1.hashid,
                        stack: TestObjects.stack1.hashid
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(200)

                const response2 = await app.inject({
                    method: 'POST',
                    url: '/api/v1/projects',
                    payload: {
                        name: 'billing-project-2',
                        team: trialTeam.hashid,
                        projectType: TestObjects.projectType1.hashid,
                        template: TestObjects.template1.hashid,
                        stack: TestObjects.stack1.hashid
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response2.statusCode.should.equal(402)
            })

            it('Cannot create a project if trial-mode has expired', async function () {
                app.settings.set('user:team:trial-mode', true)
                app.settings.set('user:team:trial-mode:duration', 5)
                app.settings.set('user:team:trial-mode:projectType', TestObjects.projectType1.hashid)

                // Create trial team - with trialEndsAt in the past
                const trialTeam = await app.db.models.Team.create({ name: 'noBillingTeam', TeamTypeId: app.defaultTeamType.id, trialEndsAt: Date.now() - 86400000 })
                await trialTeam.addUser(TestObjects.alice, { through: { role: Roles.Owner } })

                // Try to create project using the permitted projectType for trials - projectType1
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/projects',
                    payload: {
                        name: 'billing-project',
                        team: trialTeam.hashid,
                        projectType: TestObjects.projectType1.hashid,
                        template: TestObjects.template1.hashid,
                        stack: TestObjects.stack1.hashid
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(402)
            })

            it('Cannot restart suspended project if trial-mode has expired', async function () {
                app.settings.set('user:team:trial-mode', true)
                app.settings.set('user:team:trial-mode:duration', 5)
                app.settings.set('user:team:trial-mode:projectType', TestObjects.projectType1.hashid)

                // Create trial team
                const trialTeam = await app.db.models.Team.create({ name: 'noBillingTeam', TeamTypeId: app.defaultTeamType.id, trialEndsAt: Date.now() + 86400000 })
                await trialTeam.addUser(TestObjects.alice, { through: { role: Roles.Owner } })

                // Create project
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/projects',
                    payload: {
                        name: 'billing-project',
                        team: trialTeam.hashid,
                        projectType: TestObjects.projectType1.hashid,
                        template: TestObjects.template1.hashid,
                        stack: TestObjects.stack1.hashid
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(200)
                const project = response.json()

                // Suspend it
                const suspendResponse = await app.inject({
                    method: 'POST',
                    url: `/api/v1/projects/${project.id}/actions/suspend`,
                    payload: {},
                    cookies: { sid: TestObjects.tokens.alice }
                })
                suspendResponse.statusCode.should.equal(200)
                const createdProject = await app.db.models.Project.byId(project.id)
                createdProject.state.should.equal('suspended')

                // Update team trial expiry
                trialTeam.trialEndsAt = new Date(Date.now() - 1000)
                await trialTeam.save()

                // Attempt to restart the project
                const unsuspendResponse = await app.inject({
                    method: 'POST',
                    url: `/api/v1/projects/${project.id}/actions/start`,
                    payload: {},
                    cookies: { sid: TestObjects.tokens.alice }
                })
                unsuspendResponse.statusCode.should.equal(402)
            })
        })
    })
})
