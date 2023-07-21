const crypto = require('crypto')

// const FF_UTIL = require('flowforge-test-utils')
// const { Roles } = FF_UTIL.require('forge/lib/roles')
function decryptCreds (key, cipher) {
    console.log('key', key, 'cipher', cipher)

    let flows = cipher.$
    const initVector = Buffer.from(flows.substring(0, 32), 'hex')
    flows = flows.substring(32)
    const decipher = crypto.createDecipheriv('aes-256-ctr', key, initVector)
    const decrypted = decipher.update(flows, 'base64', 'utf8') + decipher.final('utf8')
    return JSON.parse(decrypted)
}

exports.decryptCreds = decryptCreds
