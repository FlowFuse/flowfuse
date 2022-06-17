const { DynSecClient } = require('@flowforge/mosquitto-dynsec-client')
const roles = require('./roles')
const clients = require('./clients')

class SecurityManager {
    constructor (app) {
        this.app = app
    }

    async init () {
        const brokerConfig = {
            username: this.app.config.broker.user,
            password: this.app.config.broker.password
        }
        this.dynsecClient = new DynSecClient(this.app.config.broker.url, brokerConfig)

        this.dynsecClient.on('error', (err) => {
            this.app.log.warn(`[comms] ${err.toString()}`)
        })
        await this.dynsecClient.connect()
        this.app.log.info('Comms connected')

        await this.ensurePlatformUser()
    }

    async ensurePlatformUser () {
        this.app.log.debug('[comms] checking forge_platform role')
        // Check to see if the `forge_platform` user exists
        const platformRole = await this.dynsecClient.getRole({ rolename: 'forge_platform' }).catch(_ => {})
        if (!platformRole) {
            this.app.log.debug('[comms] creating forge_platform role')
            await this.dynsecClient.createRole(roles.forgePlatform())

            let commsToken = this.app.settings.get('commsToken')
            if (!commsToken) {
                commsToken = this.app.db.utils.generateToken(32)
                await this.app.settings.set('commsToken', commsToken)
            }

            await this.dynsecClient.createClient({
                username: 'forge_platform',
                password: commsToken,
                roles: [{ rolename: 'forge_platform', priority: -1 }]
            })
        } else {
            this.app.log.debug('[comms] forge_platform role exists')
        }
    }

    async createTeam (team) {
        await this.dynsecClient.createRole(roles.team(team.hashid))
    }

    async deleteTeam (team) {
        await this.dynsecClient.deleteRole({
            rolename: roles.team(team.hashid).rolename
        })
    }

    async createProjectClient (project) {
        const team = project.Team
        await this.dynsecClient.createRole(roles.project(team.hashid, project.id))
        await this.dynsecClient.createRole(roles.launcher(team.hashid, project.id))
        const username = `project-${project.id}`
        const password = '1234'
        await this.dynsecClient.createClient(clients.project(team.hashid, project.id, password))
        return {
            username,
            password
        }
    }

    async deleteProjectClient (project) {
        const team = project.Team
        await this.dynsecClient.deleteClient({
            username: `project-${project.id}`
        })
        await this.dynsecClient.deleteRole({
            rolename: roles.project(team.hashid, project.id).rolename
        })
        await this.dynsecClient.deleteRole({
            rolename: roles.launcher(team.hashid, project.id).rolename
        })
    }

    async refreshProjectClientCredentials (project) {
        const username = `project-${project.id}`
        const password = '23456'
        await this.dynsecClient.modifyClient({
            username,
            password
        })
        return {
            username,
            password
        }
    }

    async createDeviceClient (device) {
        await this.dynsecClient.createRole(roles.device(device.Team.hashid, device.hashid))
        const username = `device-${device.hashid}`
        const password = '1234'
        await this.dynsecClient.createClient(clients.device(device.Team.hashid, device.hashid, password))
        return {
            username,
            password
        }
    }

    async deleteDeviceClient (device) {
        await this.dynsecClient.deleteClient({
            username: `device-${device.hashid}`
        })
        await this.dynsecClient.deleteRole({
            rolename: roles.device(device.Team.hashid, device.hashid).rolename
        })
    }

    async addDeviceClientToProject (device) {
        await this.dynsecClient.addClientRole({
            username: `device-${device.hashid}`,
            rolename: `project-${device.Project.id}`,
            priority: -1
        })
    }

    async removeDeviceClientFromProject (device, project) {
        await this.dynsecClient.removeClientRole({
            username: `device-${device.hashid}`,
            rolename: `project-${project.id}`
        })
    }

    async refreshDeviceClientCredentials (device) {
        const username = `project-${device.hashid}`
        const password = '23456'
        await this.dynsecClient.modifyClient({
            username,
            password
        })
        return {
            username,
            password
        }
    }
}

module.exports = {
    SecurityManager
}
