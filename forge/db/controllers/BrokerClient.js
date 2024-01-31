const { generateToken, compareHash } = require('../utils')

module.exports = {
    /**
     * Validate the username/password
     */
    authenticateCredentials: async function (app, username, password) {
        const user = await app.db.models.BrokerClient.findOne({
            where: { username },
            attributes: ['username', 'password']
        })
        if (compareHash(password || '', user ? user.password : '')) {
            if (username.startsWith('frontend:')) {
                await user.destroy()
            }
            return true
        }
        return false
    },

    ensurePlatformClient: async function (app, project) {
        const existingClient = await app.db.models.BrokerClient.findOne({
            where: {
                username: 'forge_platform'
            }
        })
        if (existingClient) {
            return
        }
        const username = 'forge_platform'
        const password = generateToken(32, 'ffbpl')
        await app.db.models.BrokerClient.create({
            username,
            password,
            ownerId: '',
            ownerType: 'platform'
        })
        await app.settings.set('commsToken', password)
        return {
            username,
            password
        }
    },

    /**
     *
     */
    createClientForProject: async function (app, project) {
        if (app.comms) {
            const existingClient = await app.db.models.BrokerClient.findOne({
                where: {
                    ownerId: project.id,
                    ownerType: 'project'
                }
            })
            if (existingClient) {
                await existingClient.destroy()
            }
            if (!project.Team) {
                // When restarting the platform, the container drivers get a minimal list
                // of projects to restart. They don't necessarily include the Team in their
                // query - so we need to ensure its available.
                await project.reload({
                    include: [{
                        model: app.db.models.Team,
                        attributes: ['hashid', 'id', 'name', 'slug', 'links']
                    }]
                })
            }
            const username = `project:${project.Team.hashid}:${project.id}`
            const password = generateToken(32, 'ffbp')
            await app.db.models.BrokerClient.create({
                username,
                password,
                ownerId: project.id,
                ownerType: 'project'
            })
            return {
                url: app.config.broker.url || null,
                username,
                password
            }
        }
        return null
    },

    createClientForDevice: async function (app, device) {
        if (app.comms) {
            const existingClient = await app.db.models.BrokerClient.findOne({
                where: {
                    ownerId: '' + device.id,
                    ownerType: 'device'
                }
            })
            if (existingClient) {
                await existingClient.destroy()
            }
            const username = `device:${device.Team.hashid}:${device.hashid}`
            const password = generateToken(32, 'ffbd')
            await app.db.models.BrokerClient.create({
                username,
                password,
                ownerId: '' + device.id,
                ownerType: 'device'
            })
            return {
                // Devices should default to the public url if set
                url: app.config.broker.public_url || app.config.broker.url || null,
                username,
                password
            }
        }
        return null
    },

    createClientForFrontend: async function (app, device) {
        if (app.comms) {
            const existingClient = await app.db.models.BrokerClient.findOne({
                where: {
                    ownerId: '' + device.id,
                    ownerType: 'frontend'
                }
            })
            if (existingClient) {
                await existingClient.destroy()
            }

            const username = `frontend:${device.Team.hashid}:${device.hashid}`
            const password = generateToken(32, 'ffbf')
            await app.db.models.BrokerClient.create({
                username,
                password,
                ownerId: '' + device.id,
                ownerType: 'frontend'
            })
            return {
                url: app.config.broker.public_url || app.config.broker.url || null,
                username,
                password
            }
        }
        return null
    }
}
