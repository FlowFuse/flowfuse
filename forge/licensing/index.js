const fp = require('fastify-plugin')

const loader = require('./loader')

module.exports = fp(async function (app, opts) {
    /*
    Dev License:
    License Details:
    {
        "id": "a428c0da-51a4-4e75-bb90-e8932b498dda",
        "ver": "2024-03-04",
        "iss": "FlowForge Inc.",
        "sub": "FlowForge Inc. Development",
        "nbf": 1709510400,
        "exp": 7986816000,
        "note": "Development-mode Only. Not for production",
        "users": 150,
        "teams": 50,
        "instances": 100,
        "tier": "enterprise",
        "dev": true
    }
    License:
    ---
    eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImE0MjhjMGRhLTUxYTQtNGU3NS1iYjkwLWU4OTMyYjQ5OGRkYSIsInZlciI6IjIwMjQtMDMtMDQiLCJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGb3JnZSBJbmMuIERldmVsb3BtZW50IiwibmJmIjoxNzA5NTEwNDAwLCJleHAiOjc5ODY4MTYwMDAsIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxNTAsInRlYW1zIjo1MCwiaW5zdGFuY2VzIjoxMDAsInRpZXIiOiJlbnRlcnByaXNlIiwiZGV2Ijp0cnVlLCJpYXQiOjE3MDk1NjI5NTZ9.f9ZDE-IelVeM53JsHWyHd9FggZ30CRFCJ_jhxebALwt--TFnmL5d7f9CBd9g6fmGjro_y0ZINBJKkzYPSeXKrw
    ---
    */

    // TODO: load license from local file or app.config.XYZ

    // Default to separate licensing for devices/projects.
    // This will change to combined licensing when we update the defaults
    let licenseModeCombinedInstances = true
    const defaultLimits = {
        users: 5,
        teams: 5,
        instances: 5
    }

    let userLicense = await app.settings.get('license')

    if (!userLicense) {
        userLicense = app.config.license
    }

    // if (!userLicense) {
    //     console.warn("No user-provided license found - using development license")
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
        status: () => {
            return status()
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

    function status () {
        const PRE_EXPIRE_WARNING_DAYS = 30 // hard coded
        const oneDay = 24 * 60 * 60 * 1000 // 24 hours
        const now = Date.now()
        const isLicensed = licenseApi.active()
        const licenseType = isLicensed ? (licenseApi.get('dev') ? 'DEV' : 'EE') : 'CE'
        const expiresAt = isLicensed
            ? licenseApi.get('expiresAt') // EE: get from license
            : new Date(now + (365 * oneDay)) // CE: always valid (always 1 year from now)
        const expired = expiresAt < now
        const daysRemaining = expired ? 0 : Math.floor((expiresAt - now) / oneDay)
        const expiring = !expired && daysRemaining <= PRE_EXPIRE_WARNING_DAYS
        return {
            type: licenseType, // 'CE', 'EE', or 'DEV'
            expiresAt, // Date
            expiring, // boolean flag
            expired, // boolean flag
            daysRemaining, // number of days remaining
            PRE_EXPIRE_WARNING_DAYS // number of days before expiration to warn
        }
    }

    /**
     * Get usage and limits information for the license (all, or by resource)
     * @param {'users'|'teams'|'instances'|'devices'} [resource] The name of resource usage to get. Leave null to get all usage
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
        if (licenseModeCombinedInstances) {
            if (!resource || resource === 'instances' || resource === 'devices') {
                usage[resource || 'instances'] = {
                    resource: resource || 'instances',
                    count: (await app.db.models.Project.count()) + (await app.db.models.Device.count()),
                    limit: licenseApi.get('instances') || (licenseApi.get('projects') + licenseApi.get('devices'))
                }
            }
        } else {
            if (!resource || resource === 'instances') {
                usage.instances = {
                    resource: 'instances',
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
        }
        return usage
    }

    async function reportUsage () {
        const { users, teams, devices, instances } = await usage()
        const logUse = (name, count, limit) => {
            const logger = (count > limit ? app.log.warn : app.log.info).bind(app.log)
            logger(`${name}: ${count}/${limit}`)
        }
        app.log.info('Usage       : count/limit')
        logUse(' Users      ', users.count, users.limit)
        logUse(' Teams      ', teams.count, teams.limit)
        logUse(' Instances  ', instances.count, instances.limit)
        if (!licenseModeCombinedInstances) {
            logUse(' Devices    ', devices.count, devices.limit)
        }
    }

    async function applyLicense (license) {
        activeLicense = await loader.verifyLicense(license)
        app.log.info('License verified:')
        if (activeLicense.dev) {
            app.log.info('  ****************************')
            app.log.info('  * Development-mode License *')
            app.log.info('  ****************************')
        }
        app.log.info(` License ID   : ${activeLicense.id}`)
        app.log.info(` Org          : ${activeLicense.organisation}`)
        app.log.info(` Valid From   : ${activeLicense.validFrom.toISOString()}`)
        app.log.info(` License Tier : ${activeLicense.tier}`)
        if (activeLicense.expired) {
            app.log.warn(` Expired      : ${activeLicense.expiresAt.toISOString()}`)
        } else {
            app.log.info(` Expires      : ${activeLicense.expiresAt.toISOString()}`)
        }
        if (licenseApi.get('instances') === undefined) {
            // pre 2.2 license that does not combine instance and device counts
            licenseModeCombinedInstances = false
        } else {
            licenseModeCombinedInstances = true
        }
        await reportUsage()
    }
}, { name: 'app.licensing' })
