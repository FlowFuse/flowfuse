module.exports = function (app) {
    app.addSchema({
        $id: '3rdPartyBroker',
        type: 'object',
        properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            host: { type: 'string' },
            port: { type: 'number' },
            protocol: { type: 'string' },
            ssl: { type: 'boolean' },
            verifySSL: { type: 'boolean' },
            clientId: { type: 'string' }
        },
        additionalProperties: true
    })
    return {
        clean: function (cred) {
            const result = cred.toJSON()
            const cleaned = {
                id: result.hashid,
                name: result.name,
                host: result.host,
                port: result.port,
                protocol: result.protocol,
                ssl: result.ssl,
                verifySSL: result.verifySSL,
                clientId: result.clientId
            }
            return cleaned
        },
        cleanList: function (list) {
            const filtered = []
            list.brokers.forEach(u => {
                filtered.push(this.clean(u))
            })
            list.brokers = filtered
            return list
        }
    }
}
