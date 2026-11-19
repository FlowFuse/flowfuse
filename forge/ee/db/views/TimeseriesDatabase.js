module.exports = function (app) {
    app.addSchema({
        $id: 'TimeseriesDatabaseSummary',
        type: 'object',
        properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            kind: { type: 'string', enum: ['managed', 'external'] },
            state: { type: 'string' },
            stateDetail: { type: 'string', nullable: true },
            tier: { type: 'string', nullable: true },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' }
        },
        required: ['id', 'name', 'kind', 'state'],
        additionalProperties: false
    })

    app.addSchema({
        $id: 'TimeseriesIlpConnection',
        type: 'object',
        properties: {
            protocol: { type: 'string' },
            host: { type: 'string' },
            port: { type: 'number' },
            authType: { type: 'string' },
            username: { type: 'string' },
            password: { type: 'string' },
            token: { type: 'string' },
            tlsVerify: { type: 'boolean' },
            tlsCa: { type: 'string' },
            protocolVersion: { type: 'string' }
        },
        additionalProperties: false
    })

    app.addSchema({
        $id: 'TimeseriesPgwireConnection',
        type: 'object',
        properties: {
            host: { type: 'string' },
            port: { type: 'number' },
            user: { type: 'string' },
            password: { type: 'string' },
            database: { type: 'string' },
            ssl: { type: 'boolean' },
            sslVerify: { type: 'boolean' },
            ca: { type: 'string' }
        },
        additionalProperties: false
    })

    app.addSchema({
        $id: 'TimeseriesDatabaseConnection',
        type: 'object',
        properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            kind: { type: 'string' },
            state: { type: 'string' },
            stateDetail: { type: 'string', nullable: true },
            tier: { type: 'string', nullable: true },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
            connection: {
                type: 'object',
                properties: {
                    ilp: { $ref: 'TimeseriesIlpConnection' },
                    pgwire: { $ref: 'TimeseriesPgwireConnection' }
                }
            }
        },
        additionalProperties: false
    })

    function summary (database) {
        if (!database) {
            return null
        }
        return {
            id: database.hashid,
            name: database.name,
            kind: database.kind,
            state: database.state,
            stateDetail: database.stateDetail ?? null,
            tier: database.tier ?? null,
            createdAt: database.createdAt?.toISOString?.() ?? database.createdAt,
            updatedAt: database.updatedAt?.toISOString?.() ?? database.updatedAt
        }
    }

    /**
     * @param {Object} database TimeseriesDatabase instance
     * @param {{ilp: Object, pgwire: Object}} connection the external audience's connection details
     */
    function connection (database, connection) {
        return {
            ...summary(database),
            connection
        }
    }

    return {
        summary,
        connection
    }
}
