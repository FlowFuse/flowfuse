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
                required: ['host', 'port', 'ssl', 'database', 'user', 'password']
            }
        }
    })

    async function table(table) {
        if (table) {
            const result = table.toJSON();
            result.id = result.hashid
            delete result.hashid;
            return result
        } else {
            return null;
        }
    }

    async function tables(tables) {
        if (tables) {
            console.log('Found tables', tables)
            return await Promise.all(tables.map(table))
        } else {
            return []
        }
    }

    return {
        table,
        tables
    }
}