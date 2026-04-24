module.exports = function (app) {
    app.addSchema({
        $id: 'MQTTBroker',
        type: 'object',
        properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            host: { type: 'string' },
            port: { type: 'number' },
            protocol: { type: 'string' },
            protocolVersion: { type: 'number' },
            ssl: { type: 'boolean' },
            verifySSL: { type: 'boolean' },
            clientId: { type: 'string' },
            state: { type: 'string' },
            topicPrefix: { type: 'array', items: { type: 'string' } },
            // status / credentials / settings are added by /:brokerId and /credentials handlers, not by the list/create view.
            status: { type: 'object', additionalProperties: true },
            credentials: { type: 'object', additionalProperties: true },
            settings: { type: 'object', additionalProperties: true }
        },
        required: ['id', 'name', 'host', 'port', 'protocol', 'protocolVersion', 'ssl', 'verifySSL', 'clientId', 'state', 'topicPrefix'],
        additionalProperties: false
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
                protocolVersion: result.protocolVersion,
                ssl: result.ssl,
                verifySSL: result.verifySSL,
                clientId: result.clientId,
                state: result.state,
                topicPrefix: result.topicPrefix
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
