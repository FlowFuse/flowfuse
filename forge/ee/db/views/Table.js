module.exports = function (app) {
    app.addSchema({
        $id: 'DatabaseCredentials',
        type: 'object',
        properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            credentials: {
                type: 'object',
                properties: {
                    host: { type: 'string' },
                    port: { type: 'number' },
                    ssl: { type: 'boolean' },
                    database: { type: 'string' },
                    user: { type: 'string' },
                    password: { type: 'string' }
                },
                required: ['host', 'port', 'ssl', 'database', 'user', 'password'],
                additionalProperties: false
            }
        },
        required: ['id', 'name', 'credentials'],
        additionalProperties: false
    })

    app.addSchema({
        $id: 'DatabaseTable',
        type: 'array',
        items: {
            type: 'object',
            properties: {
                name: { type: 'string' },
                type: { type: 'string' },
                nullable: { type: 'boolean' },
                default: { type: 'string', nullable: true },
                generated: { type: 'boolean' },
                maxLength: { type: 'number', nullable: true }
            },
            required: ['name', 'type'],
            additionalProperties: true
        }
    })

    function table (tableInstance) {
        if (tableInstance) {
            const result = tableInstance.toJSON()
            return {
                id: result.hashid,
                name: result.name,
                credentials: result.credentials
            }
        } else {
            return null
        }
    }

    function tables (tableInstances) {
        if (tableInstances) {
            return tableInstances.map(table)
        } else {
            return []
        }
    }

    return {
        table,
        tables
    }
}
