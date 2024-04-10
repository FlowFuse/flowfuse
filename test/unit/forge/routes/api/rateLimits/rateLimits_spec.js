const should = require('should') // eslint-disable-line
const rateLimits = require('../../../../../../forge/routes/rateLimits.js')
const setup = require('../../setup.js')

describe('Endpoint Rate Limiting', () => {
    describe('getLimits unit tests', () => {
        const app = {}
        let config = {}

        it('should be disabled by default', () => {
            config = {}
            const result = rateLimits.getLimits(app, config)
            result.should.be.false('getLimits should return `false` when not enabled')
        })
        it('should get correct default values', () => {
            config = { enabled: true }
            const result = rateLimits.getLimits(app, config)
            result.should.be.an.Object() // getLimits should return an `object` when enabled
            result.should.only.have.keys('enabled', 'global', 'timeWindow', 'max', 'keyGenerator', 'onExceeded')

            result.enabled.should.be.true('enabled should be true')
            result.global.should.be.true('global should be true')
            result.timeWindow.should.be.equal('1 minute')
            result.max.should.be.equal(1000)
            result.keyGenerator.should.be.a.Function()
            result.onExceeded.should.be.a.Function()
        })
        it('max should be a function when maxAnonymous is set', () => {
            config = {
                enabled: true,
                global: false,
                timeWindow: '2 minutes',
                max: 2000,
                maxAnonymous: 100
            }
            const result = rateLimits.getLimits(app, config)
            result.should.be.an.Object()
            result.should.only.have.keys('enabled', 'global', 'timeWindow', 'max', 'maxAnonymous', 'keyGenerator', 'onExceeded')

            result.enabled.should.be.true('enabled should be true')
            result.global.should.be.false('global should be false')
            result.timeWindow.should.be.equal('2 minutes')
            result.max.should.be.a.Function() // 'max should be a function when maxAnonymous is set'
            result.keyGenerator.should.be.a.Function()
            result.onExceeded.should.be.a.Function()
            result.max({ sid: '123' }).should.be.equal(2000) // query max as a logged in user - gets higher `max` value
            result.max().should.be.equal(100) // query max as an anonymous user - gets lower `maxAnonymous` value
        })
        it('keyGenerator should return sid if logged in, ip if not', () => {
            config = {
                enabled: true,
                global: false,
                timeWindow: '2 minutes',
                max: 2000,
                maxAnonymous: 100
            }
            const result = rateLimits.getLimits(app, config)
            result.should.be.an.Object()
            result.should.have.keys('keyGenerator')
            result.keyGenerator.should.be.a.Function() // 'keyGenerator should be a function'

            const reqWithoutSid = {
                headers: {
                    'x-real-ip': '1.1.1.1',
                    'x-forwarded-for': '2.2.2.2'
                },
                ip: '3.3.3.3'
            }
            const reqWithSid = {
                sid: '123',
                headers: {
                    'x-real-ip': '1.1.1.1',
                    'x-forwarded-for': '2.2.2.2'
                },
                ip: '3.3.3.3'
            }
            result.keyGenerator(reqWithoutSid).should.be.equal('1.1.1.1') // query max as an anonymous user
            result.keyGenerator(reqWithSid).should.be.equal('123') // query max as a logged in user
        })
        it('keyGenerator should return x-real-ip first, then x-forwarded-for, then ip', () => {
            config = {
                enabled: true,
                global: false,
                timeWindow: '2 minutes',
                max: 2000,
                maxAnonymous: 100
            }
            const result = rateLimits.getLimits(app, config)
            result.should.be.an.Object()
            result.should.have.keys('keyGenerator')

            const req1 = {
                ip: '3.3.3.3',
                headers: {
                    'x-forwarded-for': '2.2.2.2',
                    'x-real-ip': '1.1.1.1'
                }
            }
            const req2 = {
                ip: '5.5.5.5',
                headers: {
                    'x-forwarded-for': '4.4.4.4'
                }
            }
            const req3 = {
                ip: '6.6.6.6',
                headers: {}
            }
            result.keyGenerator(req1).should.be.equal('1.1.1.1') // x-real-ip first
            result.keyGenerator(req2).should.be.equal('4.4.4.4') // x-forwarded-for second
            result.keyGenerator(req3).should.be.equal('6.6.6.6') // ip is fallback
        })
    })

    describe('Rate Limiting plugin', () => {
        // These tests are to ensure that the no routes are using the rate limits
        // when the rate limits are disabled

        it('Plugin is not loaded when config settings are not specified (implicitly disabled)', async function () {
            const app = await setup()
            const isPluginLoaded = app.hasDecorator('rateLimit')
            isPluginLoaded.should.be.false('rateLimit plugin should not be loaded')
            app.should.not.have.property('rateLimit')
            app.config.should.have.property('rate_limits', false) // rate_limits should be false / not an object with limits etc
            app.close()
        })
        it('Plugin is not loaded when config settings explicitly disables rate limits', async function () {
            const app = await setup({
                rate_limits: {
                    enabled: false
                }
            })
            const isPluginLoaded = app.hasDecorator('rateLimit')
            isPluginLoaded.should.be.false('rateLimit plugin should not be loaded')
            app.should.not.have.property('rateLimit')
            app.config.should.have.property('rate_limits', false) // rate_limits should be false / not an object with limits etc
            app.close()
        })
        it('Plugin is loaded when config settings are enabled', async function () {
            const app = await setup({
                rate_limits: {
                    enabled: true
                    // use defaults - see getLimits unit test 'should get correct default values'
                }
            })
            const isPluginLoaded = app.hasDecorator('rateLimit')
            isPluginLoaded.should.be.true('rateLimit plugin should be loaded')
            app.should.have.property('rateLimit').and.be.a.Function()
            app.config.should.have.property('rate_limits').and.be.an.Object()
            app.config.rate_limits.should.have.property('enabled', true)
            app.config.rate_limits.should.have.property('global', true) // global should be true by default
            app.config.rate_limits.should.have.property('timeWindow', '1 minute') // timeWindow should be "1 minute" by default
            app.config.rate_limits.should.have.property('max', 1000) // max should be 1000 by default
            app.close()
        })
    })

    describe('Rate Limiting Routes', () => {
        const ROUTES = [
            // routes that are always rate limited
            { url: '/account/login', method: 'POST', shouldLimit: true },
            { url: '/account/register', method: 'POST', shouldLimit: true },
            { url: '/account/forgot_password', method: 'POST', shouldLimit: true },
            { url: '/account/reset_password/:token', method: 'POST', shouldLimit: true },
            // routes that are never rate limited
            { url: '/api/comms/auth/client', method: 'POST', shouldLimit: false },
            { url: '/api/comms/auth/acl', method: 'POST', shouldLimit: false },
            { url: '/account/logout', method: 'POST', shouldLimit: false },
            { url: '/account/verify/:token', method: 'POST', shouldLimit: false },
            // { url: '/account/verify', method: 'POST', shouldLimit: false },
            { url: '/account/authorize', method: 'GET', shouldLimit: false }, // used by oauth2, needs license
            { url: '/account/token', method: 'POST', shouldLimit: false }, // used by oauth2, needs license
            { url: '/api/v1/devices/:deviceId/editor', method: 'PUT', shouldLimit: false }, // licensed feature
            { url: '/api/v1/devices/:deviceId/editor', method: 'GET', shouldLimit: false }, // licensed feature
            { url: '/api/v1/devices/:deviceId/editor/token', method: 'GET', shouldLimit: false }, // licensed feature
            { url: '/api/v1/devices/:deviceId/editor/comms/:access_token', method: 'GET', shouldLimit: false }, // licensed feature
            { url: '/api/v1/devices/:deviceId/editor/proxy/*', method: 'GET', shouldLimit: false }, // licensed feature
            { url: '/api/v1/devices/:deviceId/editor/proxy/*', method: 'POST', shouldLimit: false }, // licensed feature
            { url: '/api/v1/devices/:deviceId/editor/proxy/*', method: 'PUT', shouldLimit: false }, // licensed feature
            { url: '/api/v1/devices/:deviceId/editor/proxy/*', method: 'HEAD', shouldLimit: false }, // licensed feature
            { url: '/api/v1/devices/:deviceId/editor/proxy/*', method: 'DELETE', shouldLimit: false }, // licensed feature
            { url: '/api/v1/devices/:deviceId/editor/proxy/*', method: 'OPTIONS', shouldLimit: false }, // licensed feature
            // a selection of other URLs that should be rate limited when global is true, but not when global is false
            { url: '/', method: 'GET', shouldLimit: 'global:true' },
            { url: '/app/main.js', method: 'GET', shouldLimit: 'global:true', route: '/*' },
            { url: '/admin/overview', method: 'GET', shouldLimit: 'global:true', route: '/*' },
            { url: '/api/v1/teams/:teamId/members', method: 'GET', shouldLimit: 'global:true' },
            { url: '/api/v1/applications/:applicationId', method: 'GET', shouldLimit: 'global:true' },
            { url: '/api/v1/projects/:instanceId/logs', method: 'GET', shouldLimit: 'global:true' }
        ]
        ROUTES.forEach((route) => {
            route.route = route.route || route.url
        })

        async function createDevice (app, options) {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/devices',
                body: {
                    name: options.name,
                    type: options.type,
                    team: options.team
                },
                cookies: { sid: options.as }
            })
            return response.json()
        }

        async function getSid (app, username, password) {
            const response = await app.inject({
                method: 'POST',
                url: '/account/login',
                payload: { username, password, remember: false }
            })
            response.cookies.should.have.length(1)
            response.cookies[0].should.have.property('name', 'sid')
            return response.cookies[0].value
        }

        describe('All Routes use limits except explicitly excluded (global:true)', () => {
            // These tests are to ensure that the routes are using the rate limits
            // this is achieved by stubbing the rateLimits.getLimits function to return a rate limit
            // and then checking that the keyGenerator function is called

            /** @type { import('forge/forge.js').ForgeApplication} */
            let app
            let defaultSid
            let device1

            before(async function () {
                // This license has limit of 2 devices
                const license = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGb3JnZSBJbmMuIERldmVsb3BtZW50IiwibmJmIjoxNjYyNTk1MjAwLCJleHAiOjc5ODcwNzUxOTksIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxNTAsInRlYW1zIjo1MCwicHJvamVjdHMiOjUwLCJkZXZpY2VzIjoyLCJkZXYiOnRydWUsImlhdCI6MTY2MjY1MzkyMX0.Tj4fnuDuxi_o5JYltmVi1Xj-BRn0aEjwRPa_fL2MYa9MzSwnvJEd-8bsRM38BQpChjLt-wN-2J21U7oSq2Fp5A'
                app = await setup({
                    license, // required to load ee only routes
                    test: {
                        // disableSchemaValidation: true,
                        fastifyRoutes: true
                    },
                    rate_limits: {
                        enabled: true,
                        global: true,
                        timeWindow: '60 seconds',
                        max: 666
                    },
                    broker: {
                        url: ':test:' // so that api/comms/auth/client and api/comms/auth/acl are loaded
                    }
                })

                // update ROUTES array with the fastify routes, so that we can check the config
                // This requires the test config to have `fastifyRoutes: true` which loads @fastify/routes plugin
                // allowing us to get the fastify routes from the app.
                ROUTES.forEach((route) => {
                    const fastifyRoutes = app.routes.get(route.route)
                    if (fastifyRoutes) {
                        route.fastifyRoute = fastifyRoutes.find((r) => r.method === route.method || (Array.isArray(r.method) && r.method.includes(route.method)))
                    }
                    if (route.fastifyRoute) {
                        // route specified test config was found in the app routes
                    } else {
                        // route not found in test config - was a route deleted or changed?
                        console.error(`Route ${route.method} ${route.route} was specified in test config but not found in app routes`)
                        // throw new Error(`Route ${route.method} ${route.route} was specified in test config but not found in app routes`)
                    }
                })

                // log in alice and get her sid
                defaultSid = await getSid(app, 'alice', 'aaPassword')

                device1 = await createDevice(app, { name: 'device1', type: 'device1', team: app.team.hashid, as: defaultSid })
                device1.should.have.property('id') // verify that the device was created
            })

            after(async function () {
                await app.close()
            })

            // Routes that should always have limits applied whether global is true or false
            describe('Routes that should always be limited', () => {
                ROUTES.filter(e => e.shouldLimit === true).forEach((route) => {
                    it(`Route ${route.method} ${route.url} should be rate limited`, async function () {
                        const routeConfig = route.fastifyRoute.config
                        routeConfig.should.have.property('rateLimit').and.be.an.Object()
                        if (routeConfig.rateLimit.hard) {
                            routeConfig.rateLimit.should.have.property('max')
                            routeConfig.rateLimit.max.should.be.equalOneOf(5, 2)
                            routeConfig.rateLimit.should.have.property('timeWindow')
                            routeConfig.rateLimit.timeWindow.should.be.equalOneOf(30000, 60000)
                        } else {
                            routeConfig.rateLimit.should.have.property('enabled', true)
                            routeConfig.rateLimit.should.have.property('global', true)
                            routeConfig.rateLimit.should.have.property('max', 666)
                            routeConfig.rateLimit.should.have.property('timeWindow', '60 seconds')
                        }
                        routeConfig.rateLimit.should.have.property('keyGenerator').and.be.a.Function()
                    })
                })
            })

            // Routes that should never have limits applied whether global is true or false
            describe('Routes that should never be limited', () => {
                ROUTES.filter(e => e.shouldLimit === false).forEach((route) => {
                    it(`Route ${route.method} ${route.url} should never be rate limited`, async function () {
                        const routeConfig = route.fastifyRoute
                        routeConfig.should.have.property('config').and.be.an.Object()
                        routeConfig.config.should.have.property('rateLimit').and.be.false()
                    })
                })
            })

            // Routes that should be limited when global is true, but not when global is false
            describe('Routes that should be limited because the global is true', () => {
                ROUTES.filter(e => e.shouldLimit === 'global:true').forEach((route) => {
                    it(`Route ${route.method} ${route.url} should be rate limited`, async function () {
                        const routeConfig = route.fastifyRoute.config
                        if (routeConfig && Object.prototype.hasOwnProperty.call(routeConfig, 'rateLimit')) {
                            // route has a config.rateLimit - it should be an object (not false)
                            // meaning that the route should be rate limited
                            routeConfig.should.have.property('rateLimit').and.be.an.Object()
                            routeConfig.rateLimit.should.have.property('enabled', true)
                            routeConfig.rateLimit.should.have.property('global', false)
                            routeConfig.rateLimit.should.have.property('max', 666)
                            routeConfig.rateLimit.should.have.property('timeWindow', '60 seconds')
                            routeConfig.rateLimit.should.have.property('keyGenerator').and.be.a.Function()
                        } else {
                            // route has no config.rateLimit - it should not be rate limited
                            // Do nothing - this is a valid test
                        }
                    })
                })
            })
        })

        describe('Only specific Routes use limits (global:false)', () => {
            // These tests are to ensure that the routes are using the rate limits
            // this is achieved by stubbing the rateLimits.getLimits function to return a rate limit
            // and then checking that the keyGenerator function is called

            /** @type { import('forge/forge.js').ForgeApplication} */
            let app
            let defaultSid
            let device1

            before(async function () {
                // This license has limit of 2 devices
                const license = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGb3JnZSBJbmMuIERldmVsb3BtZW50IiwibmJmIjoxNjYyNTk1MjAwLCJleHAiOjc5ODcwNzUxOTksIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxNTAsInRlYW1zIjo1MCwicHJvamVjdHMiOjUwLCJkZXZpY2VzIjoyLCJkZXYiOnRydWUsImlhdCI6MTY2MjY1MzkyMX0.Tj4fnuDuxi_o5JYltmVi1Xj-BRn0aEjwRPa_fL2MYa9MzSwnvJEd-8bsRM38BQpChjLt-wN-2J21U7oSq2Fp5A'
                app = await setup({
                    license, // required to load ee only routes
                    test: {
                        // disableSchemaValidation: true,
                        fastifyRoutes: true
                    },
                    rate_limits: {
                        enabled: true,
                        global: false,
                        timeWindow: '55 seconds',
                        max: 555
                    },
                    broker: {
                        url: ':test:' // so that api/comms/auth/client and api/comms/auth/acl are loaded
                    }
                })

                // update ROUTES array with the fastify routes, so that we can check the config
                // This requires the test config to have `fastifyRoutes: true` which loads @fastify/routes plugin
                // allowing us to get the fastify routes from the app.
                ROUTES.forEach((route) => {
                    const fastifyRoutes = app.routes.get(route.route)
                    if (fastifyRoutes) {
                        route.fastifyRoute = fastifyRoutes.find((r) => r.method === route.method || (Array.isArray(r.method) && r.method.includes(route.method)))
                    }
                    if (route.fastifyRoute) {
                        // route specified test config was found in the app routes
                    } else {
                        // route not found in test config - was a route deleted or changed?
                        console.error(`Route ${route.method} ${route.route} was specified in test config but not found in app routes`)
                        // throw new Error(`Route ${route.method} ${route.route} was specified in test config but not found in app routes`)
                    }
                })

                // log in alice and get her sid
                defaultSid = await getSid(app, 'alice', 'aaPassword')

                device1 = await createDevice(app, { name: 'device1', type: 'device1', team: app.team.hashid, as: defaultSid })
                device1.should.have.property('id') // verify that the device was created
            })

            after(async function () {
                await app.close()
            })

            // Routes that should always have limits applied whether global is true or false
            describe('Routes that should always be limited', () => {
                ROUTES.filter(e => e.shouldLimit === true).forEach((route) => {
                    it(`Route ${route.method} ${route.url} should be rate limited`, async function () {
                        const routeConfig = route.fastifyRoute.config
                        routeConfig.should.have.property('rateLimit').and.be.an.Object()
                        if (routeConfig.rateLimit.hard) {
                            routeConfig.rateLimit.should.have.property('max')
                            routeConfig.rateLimit.max.should.be.equalOneOf(5, 2)
                            routeConfig.rateLimit.should.have.property('timeWindow')
                            routeConfig.rateLimit.timeWindow.should.be.equalOneOf(30000, 60000)
                        } else {
                            routeConfig.rateLimit.should.have.property('enabled', true)
                            routeConfig.rateLimit.should.have.property('global', false)
                            routeConfig.rateLimit.should.have.property('max', 555)
                            routeConfig.rateLimit.should.have.property('timeWindow', '55 seconds')
                        }
                        routeConfig.rateLimit.should.have.property('keyGenerator').and.be.a.Function()
                    })
                })
            })

            // Routes that should never have limits applied whether global is true or false
            describe('Routes that should never be limited', () => {
                ROUTES.filter(e => e.shouldLimit === false).forEach((route) => {
                    it(`Route ${route.method} ${route.url} should never be rate limited`, async function () {
                        const routeConfig = route.fastifyRoute
                        routeConfig.should.have.property('config').and.be.an.Object()
                        routeConfig.config.should.have.property('rateLimit').and.be.false()
                    })
                })
            })

            // Routes that should be limited when global is true, but not when global is false
            describe('Routes that should not be limited because global is false', () => {
                ROUTES.filter(e => e.shouldLimit === 'global:true').forEach((route) => {
                    it(`Route ${route.method} ${route.url} should not be rate limited`, async function () {
                        const routeConfig = route.fastifyRoute.config
                        if (routeConfig && Object.prototype.hasOwnProperty.call(routeConfig, 'rateLimit')) {
                            // route has a config.rateLimit - it should be false
                            // meaning that the route should not be rate limited
                            routeConfig.should.have.property('rateLimit', false)
                        } else {
                            // route has no config.rateLimit - it should be rate limited because global is false
                            // Do nothing - this is a valid test
                        }
                    })
                })
            })
        })
    })
})
