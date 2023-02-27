const loader = require('./loader')
const fp = require('fastify-plugin')

module.exports = fp(async function (app, opts, next) {
    // Dev License:
    /*
    {
        "iss": "FlowForge Inc.",
        "sub": "FlowForge Inc. Development",
        "nbf": 1662422400,
        "exp": 7986902399,
        "note": "Development-mode Only. Not for production",
        "users": 150,
        "teams": 50,
        "projects": 50,
        "devices": 50,
        "dev": true
    }
    */
    // const devLicense = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGb3JnZSBJbmMuIERldmVsb3BtZW50IiwibmJmIjoxNjYyNDIyNDAwLCJleHAiOjc5ODY5MDIzOTksIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxNTAsInRlYW1zIjo1MCwicHJvamVjdHMiOjUwLCJkZXZpY2VzIjo1MCwiZGV2Ijp0cnVlLCJpYXQiOjE2NjI0ODI5ODd9.e8Jeppq4aURwWYz-rEpnXs9RY2Y7HF7LJ6rMtMZWdw2Xls6-iyaiKV1TyzQw5sUBAhdUSZxgtiFH5e_cNJgrUg'

    // TODO: load license from local file or app.config.XYZ

    const defaultLimits = {
        users: 150,
        teams: 50,
        projects: 50,
        devices: 50
    }

    let userLicense = await app.settings.get('license')

    if (!userLicense) {
        userLicense = app.config.license
    }

    // if (!userLicense) {
    //     console.log("No user-provided license found - using development license")
    //     userLicense = devLicense;
    // }
    let activeLicense = null

    const licenseApi = {
        apply: async (license) => {
            await applyLicense(license)
            await app.settings.set('license', license)
        },
        inspect: async (license) => {
            return await loader.verifyLicense(license)
        },
        active: () => activeLicense !== null,
        usage: async (resource) => {
            return await usage(resource)
        },
        get: (key) => {
            if (!key) {
                return activeLicense
            }
            if (activeLicense) {
                if (Object.hasOwn(activeLicense, key)) {
                    return activeLicense[key]
                }
                return undefined
            }
            return defaultLimits[key]
        },
        defaults: defaultLimits
    }

    if (userLicense) {
        try {
            await applyLicense(userLicense)
        } catch (err) {
            throw new Error('Failed to apply license: ' + err.toString())
        }
    } else {
        app.log.info('No license applied')
        await reportUsage()
    }
    app.decorate('license', licenseApi)

    next()

    /**
     * Get usage and limits information for the license (all, or by resource)
     * @param {'users'|'teams'|'projects'|'devices'} [resource] The name of resource usage to get. Leave null to get all usage
     * @returns The usage information
     */
    async function usage (resource) {
        const usage = {}
        if (!resource || resource === 'users') {
            usage.users = {
                resource: 'users',
                count: await app.db.models.User.count(),
                limit: licenseApi.get('users')
            }
        }
        if (!resource || resource === 'teams') {
            usage.teams = {
                resource: 'teams',
                count: await app.db.models.Team.count(),
                limit: licenseApi.get('teams')
            }
        }
        if (!resource || resource === 'projects') {
            usage.projects = {
                resource: 'projects',
                count: await app.db.models.Project.count(),
                limit: licenseApi.get('projects')
            }
        }
        if (!resource || resource === 'devices') {
            usage.devices = {
                resource: 'devices',
                count: await app.db.models.Device.count(),
                limit: licenseApi.get('devices')
            }
        }
        return usage
    }

    async function reportUsage () {
        const { users, teams, projects, devices } = await usage()
        const logUse = (name, count, limit) => {
            const logger = (count > limit ? app.log.warn : app.log.info).bind(app.log)
            logger(`${name}: ${count}/${limit}`)
        }
        app.log.info('Usage       : count/limit')
        logUse(' Users      ', users.count, users.limit)
        logUse(' Teams      ', teams.count, teams.limit)
        logUse(' Projects   ', projects.count, projects.limit)
        logUse(' Devices    ', devices.count, devices.limit)
    }

    async function applyLicense (license) {
        activeLicense = await loader.verifyLicense(license)
        app.log.info('License verified:')
        if (activeLicense.dev) {
            app.log.info('  ****************************')
            app.log.info('  * Development-mode License *')
            app.log.info('  ****************************')
        }
        app.log.info(` License ID : ${activeLicense.id}`)
        app.log.info(` Org        : ${activeLicense.organisation}`)
        app.log.info(` Valid From : ${activeLicense.validFrom.toISOString()}`)
        app.log.info(` Expires    : ${activeLicense.expiresAt.toISOString()}`)
        await reportUsage()
    }
})
