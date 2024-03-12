// This is a command-line tool used to generate valid FlowFuse license files.

// A license file is encoded as a JSON Web Token signed using ES256
// It consists of a well-defined set of claims. These claims identify who
// the license is for, when it was created and when it expires.
// It also includes claims relating to what the license entitles the user to do
// with the platform.

// Currently, there is both a development public and private key in this repository.
// These are completely insecure keys to be used at this very early stage of
// development - they are used by the tests to generate and verify licenses.
//
// To generate a production license, you will need to access the Production private key
// file in the FlowFuse 1Password vault

// ref: https://www.scottbrady91.com/OpenSSL/Creating-Elliptical-Curve-Keys-using-OpenSSL

// 1. generate an ES256 key pair
// openssl ecparam -name prime256v1 -genkey -noout -out private-key.pem
// 2. encrypt it with a passphrase
// openssl ec -in private-key.pem -out private-key_enc.pem -aes256
// 3. extract the public key
// openssl ec -in private-key_enc.pem -pubout -out public-key.pem

// To generate a license, update the 'licenseDetails' object below and run this
// file directly.

const fs = require('fs')

const jwt = require('jsonwebtoken')
const promptly = require('promptly')
const { v4: uuidv4 } = require('uuid')

;(async () => {
    console.info('FlowFuse EE License Generator')
    console.info('------------------------------')
    try {
        const devLicense = await promptly.confirm('Is this a development-only license? (Y/n): ', { default: 'y' })

        const key = devLicense
            ? fs.readFileSync('dev-private-key_enc.pem')
            : await promptly.prompt('Production license private key filename: ', {
                validator: (value) => {
                    if (!fs.existsSync(value)) {
                        throw new Error('Private key file not found')
                    }
                    return fs.readFileSync(value)
                }
            })

        const passphrase = devLicense
            ? 'password'
            : await promptly.password('Passphrase: ', {
                replace: '*'
            })

        const licenseTier = await promptly.choose('License tier (teams*, enterprise): ', ['teams', 'enterprise'], { default: 'teams', trim: true })

        const licenseHolder = await promptly.prompt('License holder name: ')

        const maxUsers = parseInt(await promptly.prompt('Max allowed users: ', { default: '5' }))
        const maxTeams = parseInt(await promptly.prompt('Max allowed teams: ', { default: '5' }))
        const maxInstances = parseInt(await promptly.prompt('Max allowed instances (hosted + devices): ', { default: '5' }))

        const licenseNotes = devLicense
            ? 'Development-mode Only. Not for production'
            : await promptly.prompt('License notes: ', { default: '' })

        const today = new Date().toISOString().substring(0, 10)
        const validFrom = await promptly.prompt(`Valid from [${today}]: `, {
            default: today,
            validator: (value) => {
                const date = new Date(value)
                if (isNaN(date.getTime())) {
                    throw new Error('Invalid start time')
                }
                return Math.floor(date.getTime() / 1000)
            }
        })

        const defaultExpire = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().substring(0, 10)
        const expiry = await promptly.prompt(`Expire at [${defaultExpire}]: `, {
            default: defaultExpire,
            validator: (value) => {
                const date = new Date(value)
                if (isNaN(date.getTime())) {
                    throw new Error('Invalid expire time')
                }
                return Math.floor(date.getTime() / 1000)
            }
        })

        // generate a random license id (uuid)
        const licenseId = uuidv4()

        const licenseDetails = {
            id: licenseId,
            ver: '2024-03-04', // Used to determined the format of the license.
            iss: 'FlowForge Inc.', // DO NOT CHANGE
            sub: licenseHolder, // Name of the license holder
            nbf: validFrom,
            exp: expiry, // Expiry of the license in epoch seconds
            note: licenseNotes, // Freeform text to associate with license
            users: maxUsers,
            teams: maxTeams,
            instances: maxInstances,
            tier: licenseTier
        }

        if (devLicense) {
            licenseDetails.dev = true
        }

        const licenseText = jwt.sign(
            licenseDetails,
            { key, passphrase },
            { algorithm: 'ES256' }
        )
        console.info()
        console.info('License Details:')
        console.info(JSON.stringify(licenseDetails, ' ', 4))
        console.info('License:')
        console.info('---')
        console.info(licenseText)
        console.info('---')
    } catch (err) {
        if (err.code === 'ERR_OSSL_EVP_BAD_DECRYPT') {
            console.warn('Error generating license: bad passphrase')
        } else if (err.code === 'TIMEDOUT') {
            // Ctrl-C.. exit quietly
        } else {
            console.warn(err)
        }
    }
})()
