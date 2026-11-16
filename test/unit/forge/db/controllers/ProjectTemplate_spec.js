const should = require('should') // eslint-disable-line
const setup = require('../setup')
// const FF_UTIL = require('flowforge-test-utils')
// const { Roles } = FF_UTIL.require('forge/lib/roles')

describe('Project Template controller', function () {
    // Use standard test data.
    let app
    before(async function () {
        app = await setup()
    })

    after(async function () {
        await app.close()
    })

    describe('Validate Settings', function () {
        it('only allows settings from the known list', async function () {
            const result = app.db.controllers.ProjectTemplate.validateSettings({
                disableEditor: true,
                httpAdminRoot: '/foo',
                dashboardUI: '/dashfoo',
                codeEditor: 'monaco',
                debugMaxLength: 999,
                apiMaxLength: '9mb',
                palette: {
                    allowInstall: true,
                    nodesExcludes: 'ex.js',
                    NOT_ALLOWED: true
                },
                modules: {
                    allowInstall: true,
                    NOT_ALLOWED: true
                },
                env: [{ name: 'ONE', value: 'FOO' }],
                NOT_ALLOWED: true
            })

            result.should.have.property('disableEditor', true)
            result.should.have.property('httpAdminRoot', '/foo')
            result.should.have.property('dashboardUI', '/dashfoo')
            result.should.have.property('codeEditor', 'monaco')
            result.should.have.property('debugMaxLength', 999)
            result.should.have.property('apiMaxLength', '9mb')
            result.should.have.property('palette')
            result.palette.should.have.property('allowInstall', true)
            result.palette.should.have.property('nodesExcludes', 'ex.js')
            result.should.have.property('modules')
            result.modules.should.have.property('allowInstall', true)
            result.should.have.property('env')
            result.env.should.have.length(1)
            result.env[0].should.have.property('name', 'ONE')

            result.should.not.have.property('NOT_ALLOWED')
            result.palette.should.not.have.property('NOT_ALLOWED')
            result.modules.should.not.have.property('NOT_ALLOWED')
        })

        it('only allow valid values for template values', async function () {
            try {
                app.db.controllers.ProjectTemplate.validateSettings({
                    disableEditor: true,
                    httpAdminRoot: '/foo',
                    dashboardUI: '/dashfoo',
                    codeEditor: 'monaco',
                    debugMaxLength: 999,
                    apiMaxLength: '9m',
                    palette: {
                        allowInstall: true,
                        nodesExcludes: 'ex.js',
                        NOT_ALLOWED: true
                    },
                    modules: {
                        allowInstall: true,
                        NOT_ALLOWED: true
                    },
                    env: [{ name: 'ONE', value: 'FOO' }],
                    NOT_ALLOWED: true
                })
            } catch (err) {
                err.message.should.eql('Invalid settings.apiMaxLength')
            }

            try {
                app.db.controllers.ProjectTemplate.validateSettings({
                    disableEditor: true,
                    httpAdminRoot: '/foo',
                    dashboardUI: '/dashfoo',
                    codeEditor: 'monaco',
                    debugMaxLength: '999m',
                    apiMaxLength: '9mb',
                    palette: {
                        allowInstall: true,
                        nodesExcludes: 'ex.js',
                        NOT_ALLOWED: true
                    },
                    modules: {
                        allowInstall: true,
                        NOT_ALLOWED: true
                    },
                    env: [{ name: 'ONE', value: 'FOO' }],
                    NOT_ALLOWED: true
                })
            } catch (err) {
                err.message.should.eql('Invalid settings.debugMaxLength')
            }
        })

        describe('debugMaxLength', function () {
            const validate = (debugMaxLength, importing) => app.db.controllers.ProjectTemplate.validateSettings({ debugMaxLength }, undefined, importing)

            it('rejects values that are not a whole number', function () {
                ;['1000 + 1', 'abc', -1, 1.5].forEach(value => {
                    should.throws(() => validate(value), /Invalid settings.debugMaxLength/)
                })
            })
            it('stores a numeric string as a number', function () {
                validate('456').should.have.property('debugMaxLength', 456)
            })
            it('keeps an empty value so clearing the field is saved', function () {
                validate('').should.have.property('debugMaxLength', '')
                validate(null).should.have.property('debugMaxLength', null)
            })
            it('drops an invalid value when importing', function () {
                validate('abc', true).should.not.have.property('debugMaxLength')
            })
        })

        describe('editor setting types', function () {
            const validate = (settings) => app.db.controllers.ProjectTemplate.validateSettings(settings)
            const textSettings = [
                ['codeEditor'],
                ['theme'],
                ['page', 'title'],
                ['page', 'favicon'],
                ['header', 'title'],
                ['header', 'url']
            ]
            const build = (path, value) => path.length === 1 ? { [path[0]]: value } : { [path[0]]: { [path[1]]: value } }
            const read = (result, path) => path.reduce((o, k) => o?.[k], result)

            it('keeps string and null text settings', function () {
                textSettings.forEach(path => {
                    should(read(validate(build(path, 'value')), path)).equal('value')
                    should(read(validate(build(path, null)), path)).equal(null)
                })
            })
            it('drops text settings that are not strings', function () {
                textSettings.forEach(path => {
                    ;[{}, 1, ['a']].forEach(value => {
                        should(read(validate(build(path, value)), path)).be.undefined()
                    })
                })
            })
            it('keeps a boolean disableEditor', function () {
                validate({ disableEditor: true }).should.have.property('disableEditor', true)
                validate({ disableEditor: false }).should.have.property('disableEditor', false)
            })
            it('drops a disableEditor that is not a boolean', function () {
                validate({ disableEditor: 'true' }).should.not.have.property('disableEditor')
            })
        })

        describe('httpNodeCORS origin', function () {
            const validate = (origin) => app.db.controllers.ProjectTemplate.validateSettings({
                httpNodeCORS: { enabled: true, origin, GET: true, POST: true, PUT: true, PATCH: true, HEAD: true, DELETE: true }
            })

            it('stores the normalised origin', function () {
                validate('http://a.example/').httpNodeCORS.should.have.property('origin', 'http://a.example')
                validate('https://a.example:8443/').httpNodeCORS.should.have.property('origin', 'https://a.example:8443')
                validate('http://a.example/#" + x + "').httpNodeCORS.should.have.property('origin', 'http://a.example')
            })
            it('keeps a wildcard origin', function () {
                validate('*').httpNodeCORS.should.have.property('origin', '*')
            })
        })

        it('only passes through settings a template policy allows', async function () {
            const templateProperties = {
                name: 'template',
                active: true,
                description: '',
                settings: {
                    env: [
                        { name: 'ALLOWED', value: '', policy: true },
                        { name: 'NOT_ALLOWED', value: '', policy: false }
                    ]
                },
                policy: {
                    disableEditor: true,
                    httpAdminRoot: false,
                    dashboardUI: false,
                    codeEditor: false,
                    palette: {
                        allowInstall: false,
                        nodesExcludes: true
                    },
                    modules: {
                        allowInstall: false
                    }
                }
            }
            const template = await app.db.models.ProjectTemplate.create(templateProperties)
            const result = app.db.controllers.ProjectTemplate.validateSettings({
                disableEditor: true,
                httpAdminRoot: '/foo',
                dashboardUI: '/dashfoo',
                codeEditor: 'monaco',
                palette: {
                    allowInstall: true,
                    nodesExcludes: 'ex.js'
                },
                modules: {
                    allowInstall: true
                },
                env: [
                    { name: 'ALLOWED', value: '123' },
                    { name: 'NOT_ALLOWED', value: '456' }
                ],
                NOT_ALLOWED: true
            }, template)

            result.should.have.property('disableEditor', true)
            result.should.not.have.property('httpAdminRoot', '/foo')
            result.should.not.have.property('dashboardUI')
            result.should.not.have.property('codeEditor', 'monaco')
            result.should.have.property('palette')
            result.palette.should.not.have.property('allowInstall', true)
            result.palette.should.have.property('nodesExcludes', 'ex.js')
            result.should.not.have.property('modules')
            result.should.not.have.property('NOT_ALLOWED')
            result.palette.should.not.have.property('NOT_ALLOWED')

            result.should.have.property('env')
            result.env.should.have.length(1)
            result.env[0].name.should.eql('ALLOWED')
            result.env[0].value.should.eql('123')
        })
        describe('httpAdminRoot', function () {
            it('normalises httpAdminRoot', async function () {
                app.db.controllers.ProjectTemplate.validateSettings({
                    httpAdminRoot: 'foo'
                }).should.have.property('httpAdminRoot', '/foo')

                app.db.controllers.ProjectTemplate.validateSettings({
                    httpAdminRoot: 'foo/'
                }).should.have.property('httpAdminRoot', '/foo')

                app.db.controllers.ProjectTemplate.validateSettings({
                    httpAdminRoot: '/'
                }).should.have.property('httpAdminRoot', '')

                app.db.controllers.ProjectTemplate.validateSettings({
                    httpAdminRoot: ''
                }).should.have.property('httpAdminRoot', '')
            })
            it('rejects invalid values', async function () {
                should(() => {
                    app.db.controllers.ProjectTemplate.validateSettings({
                        httpAdminRoot: '1 2 3'
                    })
                }).throw()
            })
        })
        describe('dashboardUI', function () {
            it('normalises dashboardUI', async function () {
                app.db.controllers.ProjectTemplate.validateSettings({
                    dashboardUI: 'foo'
                }).should.have.property('dashboardUI', '/foo')

                app.db.controllers.ProjectTemplate.validateSettings({
                    dashboardUI: 'foo/'
                }).should.have.property('dashboardUI', '/foo')

                app.db.controllers.ProjectTemplate.validateSettings({
                    dashboardUI: '/'
                }).should.have.property('dashboardUI', '')

                app.db.controllers.ProjectTemplate.validateSettings({
                    dashboardUI: ''
                }).should.have.property('dashboardUI', '')
            })
            it('rejects invalid values', async function () {
                should(() => {
                    app.db.controllers.ProjectTemplate.validateSettings({
                        dashboardUI: '1 2 3'
                    })
                }).throw()
            })
        })

        describe('palette.nodeExcludes', function () {
            it('normalises palette.nodeExcludes', async function () {
                app.db.controllers.ProjectTemplate.validateSettings({
                    palette: {
                        nodesExcludes: ' one.js , two.js, three.js,four.js ,five.js'
                    }
                }).palette.should.have.property('nodesExcludes', 'one.js,two.js,three.js,four.js,five.js')
            })
            it('rejects invalid values', async function () {
                should(() => {
                    app.db.controllers.ProjectTemplate.validateSettings({
                        palette: {
                            nodesExcludes: ' one.html'
                        }
                    })
                }).throw()

                should(() => {
                    app.db.controllers.ProjectTemplate.validateSettings({
                        palette: {
                            nodesExcludes: '(!@)£.js'
                        }
                    })
                }).throw()
            })
        })
        describe('palette.modules', function () {
            it('accepts valid values', async function () {
                should(() => {
                    app.db.controllers.ProjectTemplate.validateSettings({
                        palette: {
                            modules: [
                                { name: 'foo', version: '1.0.0' },
                                { name: 'bar', version: '2.0.0' }
                            ]
                        }
                    })
                }).not.throw()
            })
            it('rejects invalid name', async function () {
                should(() => {
                    app.db.controllers.ProjectTemplate.validateSettings({
                        palette: {
                            modules: [
                                { name: 'foo', version: '1.0.0' },
                                { name: 'bar * bar', version: '2.0.0' }
                            ]
                        }
                    })
                }).throw()
            })
            it('rejects invalid version', async function () {
                should(() => {
                    app.db.controllers.ProjectTemplate.validateSettings({
                        palette: {
                            modules: [
                                { name: 'foo', version: '1.0.0' },
                                { name: 'bar', version: 'a.b.c' }
                            ]
                        }
                    })
                }).throw()
            })
            it('rejects duplicate name', async function () {
                should(() => {
                    app.db.controllers.ProjectTemplate.validateSettings({
                        palette: {
                            modules: [
                                { name: 'foo', version: '1.0.0' },
                                { name: 'foo', version: '2.0.0' }
                            ]
                        }
                    })
                }).throw()
            })
        })
        describe('httpNodeCORS', function () {
            it('should allow origin *', async function () {
                should(() => {
                    app.db.controllers.ProjectTemplate.validateSettings({
                        httpNodeCORS: {
                            origin: '*',
                            GET: true,
                            POST: true,
                            PATCH: true,
                            PUT: true,
                            DELETE: false,
                            HEAD: true
                        }
                    })
                }).not.throw()
            })
            it('should not allow origin foo', async function () {
                should(() => {
                    app.db.controllers.ProjectTemplate.validateSettings({
                        httpNodeCORS: {
                            origin: 'foo',
                            GET: true,
                            POST: true,
                            PATCH: true,
                            PUT: true,
                            DELETE: false,
                            HEAD: true
                        }
                    })
                }).throw()
            })
            it('should allow origin http://example.com', async function () {
                should(() => {
                    app.db.controllers.ProjectTemplate.validateSettings({
                        httpNodeCORS: {
                            origin: 'http://example.com',
                            GET: true,
                            POST: true,
                            PATCH: true,
                            PUT: true,
                            DELETE: false,
                            HEAD: true
                        }
                    })
                }).not.throw()
            })
            it('should not allow origin wss://example.com', async function () {
                should(() => {
                    app.db.controllers.ProjectTemplate.validateSettings({
                        httpNodeCORS: {
                            origin: 'wss://example.com',
                            GET: true,
                            POST: true,
                            PATCH: true,
                            PUT: true,
                            DELETE: false,
                            HEAD: true
                        }
                    })
                }).throw()
            })
            it('should not allow origin http://example.com/bar', async function () {
                should(() => {
                    app.db.controllers.ProjectTemplate.validateSettings({
                        httpNodeCORS: {
                            origin: 'http://example.com/bar',
                            GET: true,
                            POST: true,
                            PATCH: true,
                            PUT: true,
                            DELETE: false,
                            HEAD: true
                        }
                    })
                }).throw()
            })
            it('should not allow GET = "foo"', async function () {
                should(() => {
                    app.db.controllers.ProjectTemplate.validateSettings({
                        httpNodeCORS: {
                            origin: '*',
                            GET: 'foo',
                            POST: true,
                            PUT: true,
                            DELETE: false,
                            HEAD: true
                        }
                    })
                }).throw()
            })
            it('should not allow missing GET', async function () {
                should(() => {
                    app.db.controllers.ProjectTemplate.validateSettings({
                        httpNodeCORS: {
                            origin: '*',
                            POST: true,
                            PUT: true,
                            DELETE: false,
                            HEAD: true
                        }
                    })
                }).throw()
            })
        })
    })

    describe('mergeSettings', function () {
        it('merges new settings in a project', async function () {
            const originalSettings = {
                disableEditor: true,
                httpAdminRoot: '/foo',
                dashboardUI: '/dashfoo',
                codeEditor: 'monaco',
                palette: {
                    allowInstall: true,
                    nodesExcludes: 'ex.js'
                },
                page: {
                    title: 'FlowForge'
                },
                modules: {
                    allowInstall: true
                },
                env: [{ name: 'one', value: 'a' }]
            }

            const result = app.db.controllers.ProjectTemplate.mergeSettings(originalSettings, {
                disableEditor: false,
                palette: {
                    nodesExcludes: 'new.js'
                },
                env: [{ name: 'two', value: 'b' }]
            })

            result.should.have.property('disableEditor', false)
            result.should.have.property('httpAdminRoot', '/foo')
            result.should.have.property('dashboardUI', '/dashfoo')
            result.should.have.property('codeEditor', 'monaco')
            result.should.have.property('palette')
            result.palette.should.have.property('allowInstall', true)
            result.palette.should.have.property('nodesExcludes', 'new.js')
            result.should.have.property('modules')
            result.modules.should.have.property('allowInstall', true)
            result.should.have.property('env')
            result.env.should.have.length(1)
            result.env[0].name.should.eql('two')
            result.should.have.property('page')
            // Check we patch the branding
            result.page.should.have.property('title', 'FlowFuse')
        })

        describe('env vars', function () {
            const cases = [
                {
                    name: 'keeps an existing empty value when merging',
                    existing: [{ name: 'EMPTY', value: '' }],
                    snapshot: [{ name: 'EMPTY', value: 'x' }],
                    merge: [{ name: 'EMPTY', value: '' }],
                    replace: [{ name: 'EMPTY', value: 'x' }]
                },
                {
                    name: 'handles a snapshot with no env vars',
                    existing: [{ name: 'one', value: 'a' }, { name: 'two', value: 'b' }],
                    snapshot: [],
                    merge: [{ name: 'one', value: 'a' }, { name: 'two', value: 'b' }],
                    replace: []
                },
                {
                    name: 'adds a hidden var that is only in the snapshot',
                    existing: [],
                    snapshot: [{ name: 'SECRET', value: 's', hidden: true }],
                    merge: [{ name: 'SECRET', value: 's', hidden: true }],
                    replace: [{ name: 'SECRET', value: 's', hidden: true }]
                },
                {
                    name: 'handles a visible instance var that is hidden in the snapshot',
                    existing: [{ name: 'X', value: 'instance' }],
                    snapshot: [{ name: 'X', value: 'snapshot', hidden: true }],
                    merge: [{ name: 'X', value: 'instance' }],
                    replace: [{ name: 'X', value: 'snapshot', hidden: true }]
                },
                {
                    name: 'handles a hidden instance var that is visible in the snapshot',
                    existing: [{ name: 'X', value: 'instance', hidden: true }],
                    snapshot: [{ name: 'X', value: 'snapshot' }],
                    merge: [{ name: 'X', value: 'instance', hidden: true }],
                    replace: [{ name: 'X', value: 'snapshot' }]
                }
            ]
            cases.forEach(({ name, existing, snapshot, merge, replace }) => {
                it(name, function () {
                    const merged = app.db.controllers.ProjectTemplate.mergeSettings({ env: existing }, { env: snapshot }, { mergeEnvVars: true })
                    merged.env.should.eql(merge)
                    const replaced = app.db.controllers.ProjectTemplate.mergeSettings({ env: existing }, { env: snapshot }, { mergeEnvVars: false })
                    replaced.env.should.eql(replace)
                })
            })
        })

        it('it clears httpNodeAuth user/pass if auth type set to not-basic', function () {
            const originalSettings = {
                httpNodeAuth: {
                    user: 'foo',
                    pass: 'bar'
                }
            }

            const result = app.db.controllers.ProjectTemplate.mergeSettings(originalSettings, {
                httpNodeAuth: {
                    type: 'flowforge-user'
                }
            })
            result.httpNodeAuth.should.have.property('type', 'flowforge-user')
            result.httpNodeAuth.should.have.property('user', '')
            result.httpNodeAuth.should.have.property('pass', '')
        })
        it('it updates httpNodeAuth user/pass if auth type set to basic', function () {
            const originalSettings = {
                httpNodeAuth: {
                    user: 'foo',
                    pass: 'bar'
                }
            }

            const result = app.db.controllers.ProjectTemplate.mergeSettings(originalSettings, {
                httpNodeAuth: {
                    type: 'basic'
                }
            })
            result.httpNodeAuth.should.have.property('type', 'basic')
            result.httpNodeAuth.should.have.property('user', 'foo')
            result.httpNodeAuth.should.have.property('pass', 'bar')
        })
    })
})
