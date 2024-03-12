const fs = require('fs')

const path = require('path')

const jwt = require('jsonwebtoken')

const LICENSE_ISSUER = 'FlowForge Inc.'

class LicenseDetails {
    constructor (license, claims) {
        // this.license = license;
        this.id = claims.id
        this.version = claims.ver || ''
        this.note = claims.note
        this.organisation = claims.sub
        this.validFrom = new Date(claims.nbf * 1000)
        this.expiresAt = new Date(claims.exp * 1000)
        this.dev = claims.dev
        this.users = claims.users || 0
        if (Object.hasOwn(claims, 'instances')) {
            this.instances = claims.instances || 0
        } else {
            this.projects = claims.projects || 0
            this.devices = claims.devices || 0
        }
        this.teams = claims.teams || 0
        this.tier = claims.tier || 'enterprise'
        Object.freeze(this)
    }

    get valid () {
        return this.validFrom > Date.now() && this.expiresAt < Date.now()
    }

    get expired () {
        return this.expiresAt < Date.now()
    }
}

function verifyLicenseWithKey (data, key) {
    const publicKey = fs.readFileSync(path.join(__dirname, key))
    return jwt.verify(data, publicKey, {
        // We'll check the expiration ourselves instead of throwing an error (which in turn, permits us to start up)
        ignoreExpiration: true,
        algorithms: ['ES256'],
        issuer: LICENSE_ISSUER
    })
}

async function verifyLicense (data) {
    let claims
    try {
        claims = verifyLicenseWithKey(data, 'flowforge-ee-public-key.pem')
    } catch (err) {
        // Failed to verify using production key, try the dev-only key
        try {
            claims = verifyLicenseWithKey(data, 'dev-public-key.pem')
        } catch (err2) {
            throw err
        }
        // We should turn on validation that anything signed with the dev keys also contain the `dev=true` claim
        //
        // if (!claims.dev) {
        //     throw new Error('Non-development license signed with development-only key')
        // }
        claims.dev = true
    }

    if (!claims.sub) {
        throw new Error("License missing 'sub' claim")
    }

    return new LicenseDetails(data, claims)
}

module.exports = {
    verifyLicense
}
