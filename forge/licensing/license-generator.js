// This is a command-line tool used to generate valid FlowForge license files.

// A license file is encoded as a JSON Web Token signed using ES256
// It consists of a well-defined set of claims. These claims identify who
// the license is for, when it was created and when it expires.
// It also includes claims relating to what the license entitles the user to do
// with the platform.

// Currently, there is both a development public and private key in this repository.
// These are completely insecure keys to be used at this very early stage of
// development - they are used by the tests to generate and verify licenses.
// At some point we will generate the proper keys, storing the private
// key in a secure location completely outside of this repository.

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

// const expiry = Math.floor((Date.now()/1000)+(60*60*24));
const validFrom = Math.floor(Date.now() / 1000)
const expiry = Math.floor(new Date('2200-01-01').getTime() / 1000)
const key = fs.readFileSync('dev-private-key_enc.pem')
const passphrase = 'password'

const licenseDetails = {
    iss: 'FlowForge Inc.', // DO NOT CHANGE
    sub: 'FlowForge Inc. Development', // Name of the license holder
    nbf: validFrom,
    exp: expiry, // Expiry of the license in epoch seconds
    note: 'For development only', // Freeform text to associate with license
    tier: 'teams', // Must be 'solo' or 'teams',
    users: '100',
    teams: '100',
    projects: '100'
}

const licenseText = jwt.sign(
    licenseDetails,
    { key, passphrase },
    { algorithm: 'ES256' }
)
console.log(licenseText)
