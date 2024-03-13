const should = require('should') // eslint-disable-line

const FF_UTIL = require('flowforge-test-utils')

describe('Check HTTP Security Headers set', () => {
    describe('CSP Headers', () => {
        let app

        afterEach(async function () {
            await app.close()
        })

        it('CSP Report only should be disabled', async function () {
            const config = {
                housekeeper: false,
                content_security_policy: {
                    enabled: false
                }
            }
            app = await FF_UTIL.setupApp(config)

            const response = await app.inject({
                method: 'GET',
                url: '/'
            })

            const headers = response.headers
            headers.should.not.have.property('content-security-policy-report-only')
            headers.should.not.have.property('content-security-policy')
        })

        it('CSP Report only should be enabled', async function () {
            const config = {
                housekeeper: false,
                content_security_policy: {
                    enabled: true,
                    report_only: true,
                    report_uri: 'https://example.com'
                }
            }
            app = await FF_UTIL.setupApp(config)

            const response = await app.inject({
                method: 'GET',
                url: '/'
            })

            const headers = response.headers
            headers.should.have.property('content-security-policy-report-only')
            const csp = response.headers['content-security-policy-report-only']
            csp.split(';').should.containEql('report-uri https://example.com')
        })

        it('CSP should be enabled', async function () {
            const config = {
                housekeeper: false,
                content_security_policy: {
                    enabled: true
                }
            }
            app = await FF_UTIL.setupApp(config)
            const response = await app.inject({
                method: 'GET',
                url: '/'
            })

            const headers = response.headers
            headers.should.have.property('content-security-policy')
            const csp = response.headers['content-security-policy']
            csp.split(';').should.containEql('base-uri \'self\'')
            csp.split(';').should.containEql('script-src \'self\' \'unsafe-inline\' \'unsafe-eval\'')
        })

        it('CSP should be enabled, custom directives', async function () {
            const config = {
                housekeeper: false,
                content_security_policy: {
                    enabled: true,
                    directives: {
                        'base-uri': 'example.com'
                    }
                }
            }
            app = await FF_UTIL.setupApp(config)
            const response = await app.inject({
                method: 'GET',
                url: '/'
            })

            const headers = response.headers
            headers.should.have.property('content-security-policy')
            const csp = response.headers['content-security-policy']
            csp.split(';').should.containEql('base-uri example.com')
        })

        it('CSP should be enabled with plausible', async function () {
            const config = {
                housekeeper: false,
                telemetry: {
                    frontend: {
                        plausible: {
                            domain: 'example.com'
                        }
                    }
                },
                content_security_policy: {
                    enabled: true
                }
            }
            app = await FF_UTIL.setupApp(config)
            const response = await app.inject({
                method: 'GET',
                url: '/'
            })

            const headers = response.headers
            headers.should.have.property('content-security-policy')
            const csp = response.headers['content-security-policy']
            csp.split(';').should.containEql('script-src \'self\' \'unsafe-inline\' \'unsafe-eval\' plausible.io')
        })

        it('CSP should be enabled with posthog', async function () {
            const config = {
                housekeeper: false,
                telemetry: {
                    frontend: {
                        posthog: {
                            apikey: 'abcde1234'
                        }
                    }
                },
                content_security_policy: {
                    enabled: true
                }
            }
            app = await FF_UTIL.setupApp(config)
            const response = await app.inject({
                method: 'GET',
                url: '/'
            })

            const headers = response.headers
            headers.should.have.property('content-security-policy')
            const csp = response.headers['content-security-policy']
            csp.split(';').should.containEql('script-src \'self\' \'unsafe-inline\' \'unsafe-eval\' app.posthog.com')
        })

        it('CSP should be enabled with hubspot', async function () {
            const config = {
                housekeeper: false,
                support: {
                    enabled: true,
                    frontend: {
                        hubspot: {
                            trackingcode: 'abcde1234'
                        }
                    }
                },
                content_security_policy: {
                    enabled: true
                }
            }
            app = await FF_UTIL.setupApp(config)
            const response = await app.inject({
                method: 'GET',
                url: '/'
            })

            const headers = response.headers
            headers.should.have.property('content-security-policy')
            const csp = response.headers['content-security-policy']
            csp.split(';').should.containEql('script-src \'self\' \'unsafe-inline\' \'unsafe-eval\' *.hs-analytics.net *.hs-banner.com *.hs-scripts.com *.hscollectedforms.net *.hubspot.com *.usemessages.com *.hubspotfeedback.com *.hsadspixel.net *.hsforms.net *.hsforms.com')
        })

        it('CSP should be enabled with hubspot and posthog', async function () {
            const config = {
                housekeeper: false,
                support: {
                    enabled: true,
                    frontend: {
                        hubspot: {
                            trackingcode: 'abcde1234'
                        }
                    }
                },
                telemetry: {
                    frontend: {
                        posthog: {
                            apikey: 'abcde1234'
                        }
                    }
                },
                content_security_policy: {
                    enabled: true
                }
            }
            app = await FF_UTIL.setupApp(config)
            const response = await app.inject({
                method: 'GET',
                url: '/'
            })

            const headers = response.headers
            headers.should.have.property('content-security-policy')
            const csp = response.headers['content-security-policy']
            csp.split(';').should.containEql('script-src \'self\' \'unsafe-inline\' \'unsafe-eval\' app.posthog.com *.hs-analytics.net *.hs-banner.com *.hs-scripts.com *.hscollectedforms.net *.hubspot.com *.usemessages.com *.hubspotfeedback.com *.hsadspixel.net *.hsforms.net *.hsforms.com')
        })
        it('CSP should be enabled with hubspot and posthog empty directive', async function () {
            const config = {
                housekeeper: false,
                support: {
                    enabled: true,
                    frontend: {
                        hubspot: {
                            trackingcode: 'abcde1234'
                        }
                    }
                },
                telemetry: {
                    frontend: {
                        posthog: {
                            apikey: 'abcde1234'
                        }
                    }
                },
                content_security_policy: {
                    enabled: true,
                    directives: {}
                }
            }
            app = await FF_UTIL.setupApp(config)
            const response = await app.inject({
                method: 'GET',
                url: '/'
            })

            const headers = response.headers
            headers.should.have.property('content-security-policy')
            const csp = response.headers['content-security-policy']
            csp.split(';').should.containEql('script-src app.posthog.com *.hs-analytics.net *.hs-banner.com *.hs-scripts.com *.hscollectedforms.net *.hubspot.com *.usemessages.com *.hubspotfeedback.com *.hsadspixel.net *.hsforms.net *.hsforms.com',
                'connect-src app.posthog.com api-eu1.hubspot.com cta-eu1.hubspot.com forms-eu1.hscollectedforms.net')
        })
        it('CSP with sentry.io', async function () {
            const config = {
                housekeeper: false,
                telemetry: {
                    frontend: {
                        sentry: 'foo'
                    }
                },
                content_security_policy: {
                    enabled: true
                }
            }
            app = await FF_UTIL.setupApp(config)
            const response = await app.inject({
                method: 'GET',
                url: '/'
            })

            const headers = response.headers
            headers.should.have.property('content-security-policy')
            const csp = response.headers['content-security-policy']
            csp.split(';').should.containEql('connect-src \'self\' *.ingest.sentry.io')
        })
        it('CSP with MQTT broker', async function () {
            const config = {
                housekeeper: false,
                broker: {
                    public_url: 'wss://mqtt.example.com'
                },
                content_security_policy: {
                    enabled: true
                }
            }
            app = await FF_UTIL.setupApp(config)
            const response = await app.inject({
                method: 'GET',
                url: '/'
            })

            const headers = response.headers
            headers.should.have.property('content-security-policy')
            const csp = response.headers['content-security-policy']
            csp.split(';').should.containEql('connect-src \'self\' mqtt.example.com')
        })
    })

    describe('HSTS Headers', async () => {
        let app

        afterEach(async function () {
            await app.close()
        })

        it('HTST not set', async function () {
            const config = {
                housekeeper: false,
                base_url: 'http://localhost:9999'
            }
            app = await FF_UTIL.setupApp(config)
            const response = await app.inject({
                method: 'GET',
                url: '/'
            })
            const headers = response.headers
            headers.should.not.have.property('strict-transport-security')
        })

        it('HTST set', async function () {
            const config = {
                base_url: 'https://localhost:9999'
            }
            app = await FF_UTIL.setupApp(config)
            const response = await app.inject({
                method: 'GET',
                url: '/'
            })
            const headers = response.headers
            headers.should.have.property('strict-transport-security')
        })
    })
})
