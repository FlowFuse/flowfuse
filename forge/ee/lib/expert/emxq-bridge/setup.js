// Provisioning and tear down of the bridge to the FF Expert broker on the FF App.
// Exposed functions: syncBridge (idempotent orchestrator — call at startup and on a
// periodic housekeeper), addBridge / removeBridge (low-level provision/teardown,
// throw on error), validateBridge (read-only health check, never throws).

const http = require('http')
const https = require('https')

const axios = require('axios')

// EMQX admin API drops idle keep-alive sockets, so axios's default agent pool (keepAlive: true)
// reuses a half-open socket and causes ECONNRESET errors on subsequent requests.
// Disable keep-alive to avoid this.
const httpAgent = new http.Agent({ keepAlive: false })
const httpsAgent = new https.Agent({ keepAlive: false })

const { connector, actionOut, sourceChat, sourceInflight, ruleIn, ruleOut } = require('./templates.js')

// EMQX v5 IDs for connector/action/source resources are `<type>:<name>`.
// Rule IDs are the rule's own `id` field.
const connectorId = `mqtt:${connector.name}`

function getConfig (app) {
    const teamBrokerEnabled = app.config.broker?.teamBroker?.enabled === true
    const expertEnabled = app.config.expert?.enabled === true
    const hasBridgeServer = !!app.config.expert?.centralBroker?.server
    const bridgeEnabled = teamBrokerEnabled && expertEnabled && hasBridgeServer

    return {
        bridgeEnabled,
        teamBrokerEnabled,
        licenseActive: app.license.active(),
        licenseExpired: app.license.status().expired,
        licenceId: app.license.get('id'), // used as the central-broker connector creds and topic prefix
        licenceJwt: app.license.raw(),
        expertBrokerServerAddress: app.config.expert?.centralBroker?.server,
        appBrokerServiceUrl: app.config.broker?.teamBroker?.api?.url,
        appBrokerApiKey: app.config.broker?.teamBroker?.api?.key,
        appBrokerSecretKey: app.config.broker?.teamBroker?.api?.secret
    }
}

/**
 * Create an axios client for the FF App Instance Broker API, authenticated with the team broker API key/secret from config.
 * @param {ReturnType<typeof getConfig>} cfg - config object for the bridge, containing API credentials and URLs
 * @returns {import('axios').AxiosInstance}
 */
function makeClient (cfg) {
    const basicAuth = `Basic ${Buffer.from(cfg.appBrokerApiKey + ':' + cfg.appBrokerSecretKey).toString('base64')}`
    // validateStatus: () => true so we can inspect status manually — DELETE tolerates 404,
    // and we want to surface the response body in error messages instead of axios's generic throw.
    return axios.create({
        baseURL: cfg.appBrokerServiceUrl,
        headers: {
            'User-Agent': 'FlowFuse',
            Accept: 'application/json',
            Authorization: basicAuth
        },
        httpAgent,
        httpsAgent,
        validateStatus: () => true
    })
}

/**
 * Helper to send a DELETE request and throw if the response isn't 204 (deleted) or 404 (already absent).
 * @param {import('axios').AxiosInstance} client - an axios client instance authenticated to the FF App Instance Broker API
 * @param {string} path - API path to send the DELETE request to (e.g. `/connectors/${connectorId}`)
 * @returns {Promise<void>}
 */
async function del (client, path) {
    const resp = await client.delete(path)
    // 204/200 = deleted; 404 = already absent
    if (resp.status === 204 || resp.status === 200 || resp.status === 404) return
    throw new Error(`failed to delete ${path} (${resp.status}): ${JSON.stringify(resp.data)}`)
}

/**
 * Helper to send a POST request and throw if the response isn't 201 (created) or 200 (already exists).
 * @param {import('axios').AxiosInstance} client - an axios client instance authenticated to the FF App Instance Broker API
 * @param {string} path - API path to send the POST request to (e.g. `/connectors`)
 * @param {object} body - request body to send as JSON
 * @returns {Promise<void>}
 */
async function post (client, path, body) {
    const resp = await client.post(path, body)
    if (resp.status === 201 || resp.status === 200) return
    throw new Error(`failed to create ${path} (${resp.status}): ${JSON.stringify(resp.data)}`)
}

async function getList (client, path) {
    const resp = await client.get(path)
    if (resp.status !== 200) {
        throw new Error(`failed to GET ${path} (${resp.status}): ${JSON.stringify(resp.data)}`)
    }
    // EMQX list endpoints aren't uniform: /sources and /actions return arrays directly,
    // /rules returns `{ data, meta }` (paginated). Normalize to an array either way.
    const data = resp.data
    if (Array.isArray(data)) return data
    if (data && Array.isArray(data.data)) return data.data
    throw new Error(`unexpected list shape from ${path}: ${JSON.stringify(data).slice(0, 200)}`)
}

// Discover existing resources attached to our connector so we can clean up
// anything left over from previous runs — including orphans from past renames
// that the current template no longer references.
async function discoverResources (client) {
    const [allSources, allActions, allRules] = await Promise.all([
        getList(client, '/sources'),
        getList(client, '/actions'),
        getList(client, '/rules?limit=100')
    ])
    const ourSources = allSources.filter(s => s.connector === connector.name)
    const ourActions = allActions.filter(a => a.connector === connector.name)
    const ourActionIds = new Set(ourActions.map(a => `${a.type}:${a.name}`))
    const ourSourceIds = new Set(ourSources.map(s => `${s.type}:${s.name}`))

    // Rules don't link to a connector directly, but they reference our actions
    // (via `rule.actions`) and our sources (via `$bridges/<type>:<name>` in SQL).
    const ourRules = allRules.filter(rule => {
        const refsAction = (rule.actions || []).some(act =>
            typeof act === 'string' && ourActionIds.has(act)
        )
        const bridgeRefs = (rule.sql || '').match(/\$bridges\/([\w:-]+)/g) || []
        const refsSource = bridgeRefs.some(ref => ourSourceIds.has(ref.slice('$bridges/'.length)))
        return refsAction || refsSource
    })

    return { ourSources, ourActions, ourRules }
}

/**
 * Read-only health check. Returns false if config disabled, resources missing,
 * licence creds drifted, central broker address drifted, or any error (errors
 * are logged, not thrown).
 *
 * NOTE: this is an existence-and-identity check, not a config-correctness check.
 * It verifies that the connector, action, both sources, and both rules are
 * present (by name/id) and that the connector's `username` and `server` fields
 * still match config — but it does NOT verify rule SQL, action/source
 * `parameters`, `enable` flags, or that an action/source is still bound to our
 * connector. A hand-edited resource with a matching name will pass. For a
 * guaranteed-clean state, call `syncBridge(app, { force: true })`.
 *
 * @param {object} app
 * @param {Object} [opts]
 * @param {ReturnType<typeof getConfig>} [opts.cfg] - pre-built config (skips `getConfig`)
 * @param {import('axios').AxiosInstance} [opts.client] - Axios dependency (injection allows for unit testing)
 * @returns {Promise<boolean>}
 */
async function validateBridge (app, { cfg, client } = {}) {
    cfg = cfg || getConfig(app)
    if (!cfg.bridgeEnabled) {
        return false
    }
    client = client || makeClient(cfg)
    try {
        const connectors = await getList(client, '/connectors')
        const hasConnector = connectors.some(c => c.name === connector.name && c.type === 'mqtt')
        if (!hasConnector) {
            app.log.info('Expert bridge connector not found')
            return false
        }
        // check licenceId
        const connectorResp = await client.get(`/connectors/${connectorId}`)
        if (connectorResp.status !== 200) {
            app.log.info('Failed to get EMQX connector details')
            return false
        }
        if (connectorResp.data.username !== cfg.licenceId) {
            app.log.info('EMQX connector credentials do not match FF licence')
            return false
        }
        if (connectorResp.data.server !== cfg.expertBrokerServerAddress) {
            app.log.info('EMQX connector server does not match the central broker address')
            return false
        }
        const [actions, sources, rules] = await Promise.all([
            getList(client, '/actions'),
            getList(client, '/sources'),
            getList(client, '/rules?limit=100')
        ])
        const hasAction = actions.some(a => a.name === actionOut.name && a.type === 'mqtt')
        if (!hasAction) {
            app.log.info('Expert bridge action not found')
            return false
        }
        const hasSourceChat = sources.some(s => s.name === sourceChat.name && s.type === 'mqtt')
        const hasSourceInflight = sources.some(s => s.name === sourceInflight.name && s.type === 'mqtt')
        if (!hasSourceChat || !hasSourceInflight) {
            app.log.info('Expert bridge sources not found')
            return false
        }
        const hasRuleOut = rules.some(r => r.id === ruleOut.id)
        const hasRuleIn = rules.some(r => r.id === ruleIn.id)
        if (!hasRuleOut || !hasRuleIn) {
            app.log.info('Expert bridge rules not found')
            return false
        }
        return true
    } catch (err) {
        app.log.error(`Error checking EMQX bridge: ${err.message}`)
        return false
    }
}

/**
 * Idempotent orchestrator. Brings the bridge into the desired state based on
 * config + licence. Logs errors and returns a boolean — never throws.
 * @param {object} app
 * @param {Object} [opts]
 * @param {boolean} [opts.force=false] - when true, tear down and recreate. Typically safe at start up due to being no active sessions.
 * @param {import('axios').AxiosInstance} [opts.client] - Axios dependency (injection allows for unit testing)
 * @returns {Promise<boolean>} true if sync completed without error.
 */
async function syncBridge (app, { force = false, client } = {}) {
    const cfg = getConfig(app)
    const wantBridge = cfg.bridgeEnabled && cfg.licenseActive && !cfg.licenseExpired

    if (!wantBridge) {
        if (!cfg.teamBrokerEnabled) {
            // No team broker — nothing to talk to, nothing to clean up.
            return true
        }
        app.log.info('Expert bridge not enabled or licence inactive/expired, removing bridge...')
        try {
            await removeBridge(app, { cfg, client: client || makeClient(cfg) })
            return true
        } catch (err) {
            app.log.error(`Error removing EMQX bridge: ${err.message}`)
            return false
        }
    }

    client = client || makeClient(cfg)
    try {
        if (force) {
            // Full sync — safe at startup since no active sessions.
            await removeBridge(app, { cfg, client })
            await addBridge(app, { cfg, client })
        } else {
            // Runtime: only act if something's wrong, to avoid disrupting active sessions.
            const valid = await validateBridge(app, { cfg, client })
            if (!valid) {
                app.log.info(`EMQX bridge '${connectorId}' not found or misconfigured, updating...`)
                // Remove first to clear any partial / stale resources before recreating.
                await removeBridge(app, { cfg, client })
                await addBridge(app, { cfg, client })
            }
        }
        return true
    } catch (err) {
        app.log.error(`Error syncing EMQX bridge: ${err.message}`)
        return false
    }
}

/**
 * Tear down all bridge resources. Throws on API error (404s tolerated).
 * Prefer `syncBridge` for orchestration; call this directly only when the
 * caller wants the throw-on-error contract.
 * @param {object} app
 * @param {Object} [opts]
 * @param {ReturnType<typeof getConfig>} [opts.cfg] - pre-built config (skips `getConfig`)
 * @param {import('axios').AxiosInstance} [opts.client] - Axios dependency (injection allows for unit testing)
 * @returns {Promise<void>}
 */
async function removeBridge (app, { cfg, client } = {}) {
    cfg = cfg || getConfig(app)
    client = client || makeClient(cfg)
    const { ourSources, ourActions, ourRules } = await discoverResources(client)

    // Tear down in reverse dependency order. 404s are tolerated by `del`.
    for (const rule of ourRules) {
        app.log.info(`deleting EMQX rule ${rule.id}`)
        await del(client, `/rules/${rule.id}`)
    }
    for (const source of ourSources) {
        app.log.info(`deleting EMQX source ${source.type}:${source.name}`)
        await del(client, `/sources/${source.type}:${source.name}`)
    }
    for (const action of ourActions) {
        app.log.info(`deleting EMQX action ${action.type}:${action.name}`)
        await del(client, `/actions/${action.type}:${action.name}`)
    }
    app.log.info(`deleting EMQX connector ${connectorId}`)
    await del(client, `/connectors/${connectorId}`)
}

/**
 * Create all bridge resources. Throws if a resource already exists — assumes a
 * clean slate. Prefer `syncBridge` for orchestration.
 * @param {object} app
 * @param {Object} [opts]
 * @param {ReturnType<typeof getConfig>} [opts.cfg] - pre-built config (skips `getConfig`)
 * @param {import('axios').AxiosInstance} [opts.client] - Axios dependency (injection allows for unit testing)
 * @returns {Promise<void>}
 */
async function addBridge (app, { cfg, client } = {}) {
    cfg = cfg || getConfig(app)
    client = client || makeClient(cfg)

    // Clone the connector template so per-call config doesn't mutate module-level
    // state — matters for test isolation and any future concurrent callers.
    const connectorPayload = {
        ...connector,
        server: cfg.expertBrokerServerAddress,
        username: cfg.licenceId,
        password: cfg.licenceJwt
    }

    // Provision in dependency order: connector → actions/sources → rules.
    app.log.info(`creating EMQX connector ${connector.name}`)
    await post(client, '/connectors', connectorPayload)
    app.log.info(`creating EMQX action ${actionOut.name}`)
    await post(client, '/actions', actionOut)
    app.log.info(`creating EMQX source ${sourceChat.name}`)
    await post(client, '/sources', sourceChat)
    app.log.info(`creating EMQX source ${sourceInflight.name}`)
    await post(client, '/sources', sourceInflight)
    app.log.info(`creating EMQX rule ${ruleOut.id}`)
    await post(client, '/rules', ruleOut)
    app.log.info(`creating EMQX rule ${ruleIn.id}`)
    await post(client, '/rules', ruleIn)
}

module.exports = { syncBridge }
// Exposed for unit tests
module.exports._internal = { addBridge, removeBridge, validateBridge, discoverResources, getConfig, getList, makeClient, del, post }
