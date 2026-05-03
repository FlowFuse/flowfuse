const should = require('should')
const sinon = require('sinon')

const bridge = require('../../../../../../../../forge/ee/lib/expert/emxq-bridge/setup.js')
const templates = require('../../../../../../../../forge/ee/lib/expert/emxq-bridge/templates.js')

const { syncBridge } = bridge
const {
    addBridge, removeBridge, validateBridge, discoverResources,
    getConfig, getList, makeClient, del, post
} = bridge._internal

const { connector, actionOut, sourceChat, sourceInflight, ruleIn, ruleOut } = templates

// #region helpers

// A stub Fastify `app` with overrides for config and license
function makeApp (overrides = {}) {
    const cfg = overrides.config || {}
    return {
        config: {
            broker: cfg.broker !== undefined
                ? cfg.broker
                : { teamBroker: { enabled: true, api: { url: 'http://broker.test/api/v5', key: 'k', secret: 's' } } },
            expert: cfg.expert !== undefined
                ? cfg.expert
                : { enabled: true, centralBroker: { server: 'expert.test:1884' } }
        },
        license: {
            active: sinon.stub().returns(overrides.licenseActive !== false),
            status: sinon.stub().returns({ expired: overrides.licenseExpired === true }),
            get: sinon.stub().returns(overrides.licenceId || 'test-licence-id'),
            raw: sinon.stub().returns(overrides.licenceJwt || 'test.jwt.value')
        },
        log: {
            info: sinon.stub(),
            warn: sinon.stub(),
            error: sinon.stub()
        }
    }
}

// Stub axios-shaped client. Tests configure return values via .resolves on individual stubs.
function makeFakeClient () {
    return {
        get: sinon.stub(),
        post: sinon.stub().resolves({ status: 201, data: {} }),
        delete: sinon.stub().resolves({ status: 204, data: {} })
    }
}

// Default discovery response shape — empty broker (no resources to clean up).
function emptyDiscovery (client) {
    client.get.withArgs('/sources').resolves({ status: 200, data: [] })
    client.get.withArgs('/actions').resolves({ status: 200, data: [] })
    client.get.withArgs('/rules?limit=100').resolves({ status: 200, data: { data: [], meta: {} } })
}

// Discovery response with one of each provisioned (matching template names).
function fullDiscovery (client) {
    client.get.withArgs('/sources').resolves({
        status: 200,
        data: [
            { name: sourceChat.name, type: 'mqtt', connector: connector.name },
            { name: sourceInflight.name, type: 'mqtt', connector: connector.name }
        ]
    })
    client.get.withArgs('/actions').resolves({
        status: 200,
        data: [{ name: actionOut.name, type: 'mqtt', connector: connector.name }]
    })
    client.get.withArgs('/rules?limit=100').resolves({
        status: 200,
        data: {
            data: [
                { id: ruleOut.id, sql: '', actions: [`mqtt:${actionOut.name}`] },
                { id: ruleIn.id, sql: `... "$bridges/mqtt:${sourceChat.name}" ...`, actions: [] }
            ],
            meta: {}
        }
    })
}

// Set up all mocks needed for validateBridge to return true. Individual tests then
// override specific endpoints to exercise each failure branch.
function passingValidate (client, { licenceId = 'test-licence-id', server = 'expert.test:1884' } = {}) {
    client.get.withArgs('/connectors').resolves({
        status: 200, data: [{ name: connector.name, type: 'mqtt' }]
    })
    client.get.withArgs(`/connectors/mqtt:${connector.name}`).resolves({
        status: 200, data: { username: licenceId, server }
    })
    client.get.withArgs('/actions').resolves({
        status: 200, data: [{ name: actionOut.name, type: 'mqtt' }]
    })
    client.get.withArgs('/sources').resolves({
        status: 200,
        data: [
            { name: sourceChat.name, type: 'mqtt' },
            { name: sourceInflight.name, type: 'mqtt' }
        ]
    })
    client.get.withArgs('/rules?limit=100').resolves({
        status: 200, data: { data: [{ id: ruleOut.id }, { id: ruleIn.id }] }
    })
}

// #endregion helpers

describe('EMQX bridge-setup', function () {
    afterEach(function () {
        sinon.restore()
    })

    describe('getConfig', function () {
        it('returns bridgeEnabled=true when team broker, expert, and central broker server are all set', function () {
            const cfg = getConfig(makeApp())
            cfg.bridgeEnabled.should.be.true()
            cfg.teamBrokerEnabled.should.be.true()
        })

        it('returns bridgeEnabled=false when team broker is disabled', function () {
            const cfg = getConfig(makeApp({
                config: { broker: { teamBroker: { enabled: false } } }
            }))
            cfg.bridgeEnabled.should.be.false()
            cfg.teamBrokerEnabled.should.be.false()
        })

        it('returns bridgeEnabled=false when expert is disabled', function () {
            const cfg = getConfig(makeApp({
                config: { expert: { enabled: false, centralBroker: { server: 'x:1884' } } }
            }))
            cfg.bridgeEnabled.should.be.false()
        })

        it('returns bridgeEnabled=false when central broker server is missing', function () {
            const cfg = getConfig(makeApp({
                config: { expert: { enabled: true, centralBroker: {} } }
            }))
            cfg.bridgeEnabled.should.be.false()
        })

        it('includes license active/expired/id/jwt', function () {
            const cfg = getConfig(makeApp({ licenceId: 'lic-42', licenceJwt: 'jwt-token' }))
            cfg.licenseActive.should.be.true()
            cfg.licenseExpired.should.be.false()
            cfg.licenceId.should.equal('lic-42')
            cfg.licenceJwt.should.equal('jwt-token')
        })

        it('does not throw when config sections are entirely missing', function () {
            const app = { config: {}, license: { active: () => false, status: () => ({ expired: false }), get: () => null, raw: () => null } }
            should(() => getConfig(app)).not.throw()
        })
    })

    describe('makeClient', function () {
        it('builds an axios instance with baseURL, basic auth, and disabled keep-alive agents', function () {
            const cfg = {
                appBrokerServiceUrl: 'http://broker.test/api/v5',
                appBrokerApiKey: 'apikey',
                appBrokerSecretKey: 'secretkey'
            }
            const client = makeClient(cfg)
            client.defaults.baseURL.should.equal('http://broker.test/api/v5')
            client.defaults.headers.Authorization.should.equal('Basic ' + Buffer.from('apikey:secretkey').toString('base64'))
            client.defaults.httpAgent.keepAlive.should.be.false()
            client.defaults.httpsAgent.keepAlive.should.be.false()
            // validateStatus accepts every status so callers can branch on resp.status
            client.defaults.validateStatus(500).should.be.true()
        })
    })

    describe('del', function () {
        it('resolves on 200/204/404 without throwing', async function () {
            for (const status of [200, 204, 404]) {
                const client = { delete: sinon.stub().resolves({ status, data: {} }) }
                await del(client, '/anything').should.be.fulfilled()
            }
        })

        it('throws on other status codes with status and body in message', async function () {
            const client = { delete: sinon.stub().resolves({ status: 500, data: { reason: 'boom' } }) }
            await del(client, '/x').should.be.rejectedWith(/failed to delete \/x \(500\).*boom/)
        })
    })

    describe('post', function () {
        it('resolves on 200 and 201', async function () {
            for (const status of [200, 201]) {
                const client = { post: sinon.stub().resolves({ status, data: {} }) }
                await post(client, '/x', {}).should.be.fulfilled()
            }
        })

        it('throws on other status codes', async function () {
            const client = { post: sinon.stub().resolves({ status: 400, data: { code: 'BAD' } }) }
            await post(client, '/x', {}).should.be.rejectedWith(/failed to create \/x \(400\).*BAD/)
        })
    })

    describe('getList', function () {
        it('returns the array directly when the response body is an array', async function () {
            const client = { get: sinon.stub().resolves({ status: 200, data: [{ a: 1 }, { a: 2 }] }) }
            const list = await getList(client, '/x')
            list.should.have.length(2)
        })

        it('unwraps the data field for paginated responses', async function () {
            const client = { get: sinon.stub().resolves({ status: 200, data: { data: [{ a: 1 }], meta: {} } }) }
            const list = await getList(client, '/x')
            list.should.have.length(1)
        })

        it('throws on non-200 status', async function () {
            const client = { get: sinon.stub().resolves({ status: 401, data: { error: 'nope' } }) }
            await getList(client, '/x').should.be.rejectedWith(/failed to GET \/x \(401\)/)
        })

        it('throws on unexpected response shape', async function () {
            const client = { get: sinon.stub().resolves({ status: 200, data: { unexpected: true } }) }
            await getList(client, '/x').should.be.rejectedWith(/unexpected list shape/)
        })
    })

    describe('discoverResources', function () {
        it('filters sources and actions by connector name', async function () {
            const client = makeFakeClient()
            client.get.withArgs('/sources').resolves({
                status: 200,
                data: [
                    { name: 's-mine', type: 'mqtt', connector: connector.name },
                    { name: 's-other', type: 'mqtt', connector: 'someone-else' }
                ]
            })
            client.get.withArgs('/actions').resolves({
                status: 200,
                data: [
                    { name: 'a-mine', type: 'mqtt', connector: connector.name },
                    { name: 'a-other', type: 'mqtt', connector: 'someone-else' }
                ]
            })
            client.get.withArgs('/rules?limit=100').resolves({ status: 200, data: { data: [], meta: {} } })

            const { ourSources, ourActions, ourRules } = await discoverResources(client)
            ourSources.should.have.length(1)
            ourSources[0].name.should.equal('s-mine')
            ourActions.should.have.length(1)
            ourActions[0].name.should.equal('a-mine')
            ourRules.should.have.length(0)
        })

        it('matches rules that reference our actions', async function () {
            const client = makeFakeClient()
            client.get.withArgs('/sources').resolves({ status: 200, data: [] })
            client.get.withArgs('/actions').resolves({
                status: 200,
                data: [{ name: 'a-mine', type: 'mqtt', connector: connector.name }]
            })
            client.get.withArgs('/rules?limit=100').resolves({
                status: 200,
                data: {
                    data: [
                        { id: 'our-rule', sql: 'SELECT * FROM "t/x"', actions: ['mqtt:a-mine'] },
                        { id: 'not-our-rule', sql: 'SELECT * FROM "t/y"', actions: ['mqtt:not-ours'] }
                    ]
                }
            })

            const { ourRules } = await discoverResources(client)
            ourRules.should.have.length(1)
            ourRules[0].id.should.equal('our-rule')
        })

        it('matches rules that reference our sources via $bridges/<type>:<name>', async function () {
            const client = makeFakeClient()
            client.get.withArgs('/sources').resolves({
                status: 200,
                data: [{ name: 's-mine', type: 'mqtt', connector: connector.name }]
            })
            client.get.withArgs('/actions').resolves({ status: 200, data: [] })
            client.get.withArgs('/rules?limit=100').resolves({
                status: 200,
                data: {
                    data: [
                        { id: 'our-rule', sql: 'SELECT * FROM "$bridges/mqtt:s-mine"', actions: [] },
                        { id: 'not-our-rule', sql: 'SELECT * FROM "$bridges/mqtt:s-other"', actions: [] }
                    ]
                }
            })

            const { ourRules } = await discoverResources(client)
            ourRules.should.have.length(1)
            ourRules[0].id.should.equal('our-rule')
        })
    })

    describe('validateBridge', function () {
        it('returns false when bridge is disabled in config', async function () {
            const app = makeApp({ config: { expert: { enabled: false, centralBroker: { server: 'x:1' } } } })
            const result = await validateBridge(app)
            result.should.be.false()
        })

        it('returns false when our connector is not in the list', async function () {
            const app = makeApp()
            const client = makeFakeClient()
            client.get.withArgs('/connectors').resolves({ status: 200, data: [] })

            const result = await validateBridge(app, { client })
            result.should.be.false()
            app.log.info.calledWithMatch(/connector not found/).should.be.true()
        })

        it('returns false when the connector username does not match the current licence id', async function () {
            const app = makeApp({ licenceId: 'new-lic' })
            const client = makeFakeClient()
            passingValidate(client, { licenceId: 'old-lic' }) // connector body has old-lic

            const result = await validateBridge(app, { client })
            result.should.be.false()
            app.log.info.calledWithMatch(/credentials do not match/).should.be.true()
        })

        it('returns false when the connector server does not match config', async function () {
            const app = makeApp() // cfg.expertBrokerServerAddress = 'expert.test:1884'
            const client = makeFakeClient()
            passingValidate(client, { server: 'old-broker.example:1884' })

            const result = await validateBridge(app, { client })
            result.should.be.false()
            app.log.info.calledWithMatch(/server does not match/).should.be.true()
        })

        it('returns false when our action is missing', async function () {
            const app = makeApp()
            const client = makeFakeClient()
            passingValidate(client)
            // override actions to return empty
            client.get.withArgs('/actions').resolves({ status: 200, data: [] })

            const result = await validateBridge(app, { client })
            result.should.be.false()
            app.log.info.calledWithMatch(/action not found/).should.be.true()
        })

        it('returns false when one of our sources is missing', async function () {
            const app = makeApp()
            const client = makeFakeClient()
            passingValidate(client)
            // only chat source, missing the inflight source
            client.get.withArgs('/sources').resolves({
                status: 200, data: [{ name: sourceChat.name, type: 'mqtt' }]
            })

            const result = await validateBridge(app, { client })
            result.should.be.false()
            app.log.info.calledWithMatch(/sources not found/).should.be.true()
        })

        it('returns false when one of our rules is missing', async function () {
            const app = makeApp()
            const client = makeFakeClient()
            passingValidate(client)
            // only ruleOut, missing ruleIn
            client.get.withArgs('/rules?limit=100').resolves({
                status: 200, data: { data: [{ id: ruleOut.id }] }
            })

            const result = await validateBridge(app, { client })
            result.should.be.false()
            app.log.info.calledWithMatch(/rules not found/).should.be.true()
        })

        it('returns true when connector, creds, server, action, sources, and rules all check out', async function () {
            const app = makeApp()
            const client = makeFakeClient()
            passingValidate(client)

            const result = await validateBridge(app, { client })
            result.should.be.true()
        })

        it('returns false (logging error) when a request throws', async function () {
            const app = makeApp()
            const client = makeFakeClient()
            client.get.withArgs('/connectors').rejects(new Error('network down'))

            const result = await validateBridge(app, { client })
            result.should.be.false()
            app.log.error.calledWithMatch(/network down/).should.be.true()
        })
    })

    describe('addBridge', function () {
        it('POSTs connector → action → sources → rules in order, with cloned connector payload', async function () {
            const app = makeApp({ licenceId: 'lic-1', licenceJwt: 'jwt-1' })
            const cfg = getConfig(app)
            const client = makeFakeClient()

            await addBridge(app, { cfg, client })

            client.post.callCount.should.equal(6) // 1 connector + 1 action + 2 sources + 2 rules
            client.post.getCall(0).args[0].should.equal('/connectors')
            client.post.getCall(1).args[0].should.equal('/actions')
            client.post.getCall(2).args[0].should.equal('/sources')
            client.post.getCall(3).args[0].should.equal('/sources')
            client.post.getCall(4).args[0].should.equal('/rules')
            client.post.getCall(5).args[0].should.equal('/rules')

            const connectorPayload = client.post.getCall(0).args[1]
            connectorPayload.server.should.equal('expert.test:1884')
            connectorPayload.username.should.equal('lic-1')
            connectorPayload.password.should.equal('jwt-1')
            connectorPayload.name.should.equal(connector.name)
        })

        it('does not mutate the imported connector template', async function () {
            const app = makeApp()
            const cfg = getConfig(app)
            const client = makeFakeClient()
            const before = JSON.parse(JSON.stringify(connector))

            await addBridge(app, { cfg, client })

            connector.should.deepEqual(before)
        })

        it('throws when a POST returns a non-201 status', async function () {
            const app = makeApp()
            const cfg = getConfig(app)
            const client = makeFakeClient()
            client.post.withArgs('/connectors').resolves({ status: 409, data: { code: 'EXISTS' } })

            await addBridge(app, { cfg, client }).should.be.rejectedWith(/failed to create \/connectors/)
        })
    })

    describe('removeBridge', function () {
        it('does only the connector DELETE when no resources exist', async function () {
            const app = makeApp()
            const cfg = getConfig(app)
            const client = makeFakeClient()
            emptyDiscovery(client)

            await removeBridge(app, { cfg, client })

            client.delete.callCount.should.equal(1)
            client.delete.getCall(0).args[0].should.equal(`/connectors/mqtt:${connector.name}`)
        })

        it('deletes rules → sources → actions → connector in that order', async function () {
            const app = makeApp()
            const cfg = getConfig(app)
            const client = makeFakeClient()
            fullDiscovery(client)

            await removeBridge(app, { cfg, client })

            // 2 rules + 2 sources + 1 action + 1 connector = 6 deletes
            client.delete.callCount.should.equal(6)
            const paths = client.delete.getCalls().map(c => c.args[0])
            paths[0].should.match(/^\/rules\//)
            paths[1].should.match(/^\/rules\//)
            paths[2].should.match(/^\/sources\//)
            paths[3].should.match(/^\/sources\//)
            paths[4].should.match(/^\/actions\//)
            paths[5].should.equal(`/connectors/mqtt:${connector.name}`)
        })

        it('tolerates 404s on individual deletes', async function () {
            const app = makeApp()
            const cfg = getConfig(app)
            const client = makeFakeClient()
            emptyDiscovery(client)
            client.delete.resolves({ status: 404, data: {} })

            await removeBridge(app, { cfg, client }).should.be.fulfilled()
        })

        it('throws if a delete returns a non-success status', async function () {
            const app = makeApp()
            const cfg = getConfig(app)
            const client = makeFakeClient()
            emptyDiscovery(client)
            client.delete.resolves({ status: 500, data: { reason: 'boom' } })

            await removeBridge(app, { cfg, client }).should.be.rejectedWith(/failed to delete/)
        })
    })

    describe('syncBridge', function () {
        it('returns true and does nothing when team broker is disabled', async function () {
            const app = makeApp({ config: { broker: { teamBroker: { enabled: false } } } })
            const client = makeFakeClient()

            const result = await syncBridge(app, { client })
            result.should.be.true()
            client.get.called.should.be.false()
            client.post.called.should.be.false()
            client.delete.called.should.be.false()
        })

        it('removes bridge when expert is disabled (team broker still enabled)', async function () {
            const app = makeApp({ config: { expert: { enabled: false, centralBroker: { server: 'x:1' } } } })
            const client = makeFakeClient()
            emptyDiscovery(client)

            const result = await syncBridge(app, { client })
            result.should.be.true()
            client.delete.called.should.be.true()
            client.post.called.should.be.false()
        })

        it('removes bridge when licence is inactive', async function () {
            const app = makeApp({ licenseActive: false })
            const client = makeFakeClient()
            emptyDiscovery(client)

            const result = await syncBridge(app, { client })
            result.should.be.true()
            client.delete.called.should.be.true()
            client.post.called.should.be.false()
        })

        it('removes bridge when licence is expired', async function () {
            const app = makeApp({ licenseExpired: true })
            const client = makeFakeClient()
            emptyDiscovery(client)

            const result = await syncBridge(app, { client })
            result.should.be.true()
            client.delete.called.should.be.true()
            client.post.called.should.be.false()
        })

        it('returns false when delete fails (logs error)', async function () {
            const app = makeApp({ licenseExpired: true })
            const client = makeFakeClient()
            emptyDiscovery(client)
            client.delete.resolves({ status: 500, data: {} })

            const result = await syncBridge(app, { client })
            result.should.be.false()
            app.log.error.called.should.be.true()
        })

        it('with force=true: removes then adds even if the bridge looks healthy', async function () {
            const app = makeApp()
            const client = makeFakeClient()
            emptyDiscovery(client)

            const result = await syncBridge(app, { force: true, client })
            result.should.be.true()
            // 1 connector delete + 6 creates (1 connector + 1 action + 2 sources + 2 rules)
            client.delete.callCount.should.equal(1)
            client.post.callCount.should.equal(6)
            // didn't bother validating
            client.get.calledWith('/connectors').should.be.false()
        })

        it('without force: skips changes when validateBridge passes', async function () {
            const app = makeApp()
            const client = makeFakeClient()
            // make validateBridge pass
            passingValidate(client)

            const result = await syncBridge(app, { client })
            result.should.be.true()
            client.delete.called.should.be.false()
            client.post.called.should.be.false()
        })

        it('without force: removes + adds when validateBridge fails', async function () {
            const app = makeApp()
            const client = makeFakeClient()
            // validateBridge sees no connector → false
            client.get.withArgs('/connectors').resolves({ status: 200, data: [] })
            // discoverResources sees nothing to clean up
            client.get.withArgs('/sources').resolves({ status: 200, data: [] })
            client.get.withArgs('/actions').resolves({ status: 200, data: [] })
            client.get.withArgs('/rules?limit=100').resolves({ status: 200, data: { data: [] } })

            const result = await syncBridge(app, { client })
            result.should.be.true()
            client.delete.called.should.be.true()
            client.post.callCount.should.equal(6) // 1 connector + 1 action + 2 sources + 2 rules
        })

        it('returns false when an underlying call throws. (force=true) (logs error)', async function () {
            const app = makeApp()
            const client = makeFakeClient()
            emptyDiscovery(client) // removeBridge succeeds (nothing to clean up)
            client.post.rejects(new Error('boom')) // addBridge then trips on the connector POST

            const result = await syncBridge(app, { force: true, client })
            result.should.be.false()
            app.log.error.calledWithMatch(/boom/).should.be.true()
        })

        it('reads app.config and app.license once per sync run (cfg threading)', async function () {
            const app = makeApp()
            const client = makeFakeClient()
            // validate passes → no further work
            passingValidate(client) // validate passes → no further work

            await syncBridge(app, { client })

            // Each license accessor should fire exactly once during the single getConfig call.
            app.license.active.callCount.should.equal(1)
            app.license.status.callCount.should.equal(1)
            app.license.get.callCount.should.equal(1)
            app.license.raw.callCount.should.equal(1)
        })
    })
})
