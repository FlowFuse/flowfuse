/**
 * In-memory timeseries driver for tests. Set `options.fail` to make create fail.
 */
const state = {
    servers: {},
    pgbouncer: null,
    calls: []
}

module.exports = {
    state,
    init: async (app, options) => {
        state.servers = {}
        state.pgbouncer = null
        state.calls = []
        state.options = options || {}
    },
    shutdown: async () => {},
    create: async (team, database, { credentials, tier }) => {
        state.calls.push(['create', database.meta.slug])
        if (state.options.fail) {
            throw new Error('stub create failure')
        }
        const slug = database.meta.slug
        state.servers[slug] = { team: team.hashid, credentials, tier, running: true }
        return {
            endpoints: {
                internal: { host: `ts-${slug}`, httpPort: 9000, pgPort: 8812 },
                external: { host: `${slug}.ts.example.com`, httpPort: 443 }
            },
            meta: { stub: true }
        }
    },
    remove: async (team, database) => {
        state.calls.push(['remove', database.meta.slug])
        delete state.servers[database.meta.slug]
    },
    suspend: async (team, database) => {
        state.calls.push(['suspend', database.meta.slug])
        state.servers[database.meta.slug].running = false
    },
    resume: async (team, database) => {
        state.calls.push(['resume', database.meta.slug])
        state.servers[database.meta.slug].running = true
    },
    resize: async (team, database, tier) => {
        state.calls.push(['resize', database.meta.slug])
        state.servers[database.meta.slug].tier = tier
    },
    rotateCredentials: async (team, database, credentials) => {
        state.calls.push(['rotateCredentials', database.meta.slug])
        state.servers[database.meta.slug].credentials = credentials
    },
    status: async (team, database) => {
        const server = state.servers[database.meta.slug]
        if (!server) {
            return 'missing'
        }
        return server.running ? 'running' : 'stopped'
    },
    writePgbouncer: async (files) => {
        state.pgbouncer = files
    }
}
