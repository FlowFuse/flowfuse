const crypto = require('crypto')

// const FF_UTIL = require('flowforge-test-utils')
// const { Roles } = FF_UTIL.require('forge/lib/roles')
function decryptCreds (key, cipher) {
    console.log('key', key, 'cipher', cipher)

    let flows = cipher.$
    const initVector = Buffer.from(flows.substring(0, 32), 'hex')

    console.log('vector', initVector)

    flows = flows.substring(32)
    const decipher = crypto.createDecipheriv('aes-256-ctr', key, initVector)
    const decrypted = decipher.update(flows, 'base64', 'utf8') + decipher.final('utf8')
    return JSON.parse(decrypted)
}

function encryptCreds (key, plain) {
    const initVector = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv('aes-256-ctr', key, initVector)
    return { $: initVector.toString('hex') + cipher.update(JSON.stringify(plain), 'utf8', 'base64') + cipher.final('base64') }
}

module.exports = {
    encryptCreds,
    decryptCreds
}
