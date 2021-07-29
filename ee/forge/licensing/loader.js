const fs = require('fs')
const jwt = require('jsonwebtoken');

const LICENSE_ISSUER = "FlowForge Inc."
const VALID_TIERS = ['solo','teams']

class LicenseDetails {
    constructor(claims) {
        this.tier = claims.tier;
        this.note = claims.note;
        this.organisation = claims.sub;
        this.expiresAt = new Date(claims.exp*1000);
        Object.freeze(this);
    }
    get expired() {
        return this.expiresAt < Date.now();
    }
}

async function verifyLicense(data) {

    const env = process.env.NODE_ENV || "development";

    let publicKey;
    if (env === "development") {
        publicKey = fs.readFileSync(__dirname+'/dev-public-key.pem');
    } else {
        throw new Error("No production keys setup yet")
    }

    const claims = jwt.verify(data, publicKey, {
        algorithms: ["ES256"],
        issuer: LICENSE_ISSUER
    });

    if (!claims.sub) {
        throw new Error("License missing 'sub' claim");
    }
    if (!claims.tier) {
        throw new Error("License missing 'tier' claim");
    }
    if (VALID_TIERS.indexOf(claims.tier) === -1) {
        throw new Error("Invalid 'tier' claim")
    }
    return new LicenseDetails(claims);
}


module.exports = {
    verifyLicense
}
