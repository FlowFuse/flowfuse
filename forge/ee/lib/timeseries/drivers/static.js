/**
 * One QuestDB server, configured in flowforge.yml, shared by every team with the feature.
 * For self-hosted installs that run their own server. There is no isolation between teams.
 *
 * Teams can still connect their own external server, which takes precedence.
 *
 * options.questdb: { ilp: {...}, pgwire: {...} }, optionally with `external` overrides that
 * devices use instead (for example a public hostname with TLS).
 */
let questdb = {}

function ilpSettings (ilp = {}) {
    return {
        protocol: ilp.protocol || 'http',
        host: ilp.host || 'localhost',
        port: ilp.port || 9000,
        authType: ilp.authType || 'none',
        username: ilp.username || '',
        password: ilp.password || '',
        token: ilp.token || '',
        tlsVerify: ilp.tlsVerify !== false,
        tlsCa: ilp.tlsCa || '',
        protocolVersion: ilp.protocolVersion || 'auto'
    }
}

function pgwireSettings (pgwire = {}) {
    const settings = {
        host: pgwire.host || 'localhost',
        port: pgwire.port || 8812,
        user: pgwire.user || 'admin',
        password: pgwire.password || 'quest',
        database: pgwire.database || 'qdb',
        ssl: pgwire.ssl === true
    }
    if (pgwire.sslVerify !== undefined) {
        settings.sslVerify = pgwire.sslVerify !== false
    }
    if (pgwire.ca) {
        settings.ca = pgwire.ca
    }
    return settings
}

module.exports = {
    shared: true,
    init: async (app, options) => {
        questdb = options?.questdb || {}
    },
    shutdown: async () => {},
    /**
     * @param {'internal'|'external'} audience
     */
    sharedConnection: (audience) => {
        const external = audience === 'external' ? questdb.external || {} : {}
        return {
            ilp: ilpSettings({ ...questdb.ilp, ...external.ilp }),
            pgwire: pgwireSettings({ ...questdb.pgwire, ...external.pgwire })
        }
    }
}
