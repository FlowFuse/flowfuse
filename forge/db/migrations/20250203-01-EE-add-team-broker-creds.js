/**
 * Add a default broker credentials object that can be used when adding Team Broker
 * entries to the Topic Schema table
 */
module.exports = {
    /**
     * upgrade database
     * @param {QueryInterface} context Sequelize.QueryInterface
     */
    up: async (context) => {
        // sqlite will return the id of the created entry. Postgres does not.
        await context.bulkInsert('BrokerCredentials', [{
            name: 'ff-team-broker',
            host: '',
            port: 0,
            protocol: '',
            protocolVersion: 4,
            ssl: false,
            verifySSL: false,
            clientId: '',
            credentials: '',
            state: '',
            settings: '{}',
            createdAt: new Date(),
            updatedAt: new Date(),
            TeamId: null
        }])

        const defaultBrokerCreds = await context.sequelize.query('select id from "BrokerCredentials" where "name" = \'ff-team-broker\'', { type: context.sequelize.QueryTypes.SELECT })
        const defaultBrokerCredsId = defaultBrokerCreds[0].id

        await context.bulkInsert('PlatformSettings', [{
            key: 'team:broker:creds',
            // Store as a string
            value: '' + defaultBrokerCredsId,
            // Set JSON flag so will be parsed back to number
            valueType: 1,
            createdAt: new Date(),
            updatedAt: new Date()
        }])
    },
    down: async (context) => {
    }
}
