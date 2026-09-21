const fs = require('fs')

const inquirer = require('inquirer').default
const jwt = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid')

// import {v4 as uuidv4, validate} from 'uuid'
// import jwt from 'jsonwebtoken'
// import inquirer from 'inquirer'
// import fs from 'fs'

const DEFAULT_DEV_KEY_FILENAME = 'dev-private-key_enc.pem'
const DEFAULT_PROD_KEY_FILENAME = 'flowforge-ee-private-key_enc.pem'

const today = new Date().toISOString().substring(0, 10)
const defaultExpire = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().substring(0, 10)
const licenseId = uuidv4()

console.info('FlowFuse EE License Generator')
console.info('------------------------------')

;(async () => {
    try {
        const initialAnswers = await inquirer.prompt([
            {
                name: 'devLicense',
                default: true,
                type: 'confirm',
                message: 'Development Only License'
            }, {
                name: 'tiers',
                type: 'checkbox',
                choices: [{ name: 'Hub', value: 'hub' }, { name: 'Edge', value: 'edge' }, { name: 'Fleet', value: 'fleet' }],
                message: 'What license types should be included?',
                validate (input) {
                    if (input.length > 0) {
                        return true
                    } else {
                        return 'Must select at least one'
                    }
                }
            }, {
                name: 'licenseHolder',
                type: 'input',
                message: 'License holder name',
                validate (input) {
                    if (input.length > 0) {
                        return true
                    }

                    return 'License holder name must be entered'
                }
            }, {
                name: 'maxUsers',
                type: 'number',
                default: 5,
                message: 'Max allowed Users'
            }, {
                name: 'maxTeams',
                type: 'number',
                default: 5,
                message: 'Max allowed Teams'
            }
        ])
        // Now we have the tier selection, we can set the defaults for the other questions based on the selected tiers.
        const tierDefaults = {
            hosted: 10,
            remote: 10
        }
        if (!initialAnswers.tiers.includes('edge') && !initialAnswers.tiers.includes('fleet')) {
            tierDefaults.remote = 0
        }
        const moreAnswers = await inquirer.prompt([
            {
                name: 'maxHostedInstances',
                type: 'number',
                default: tierDefaults.hosted,
                message: 'Max allowed Hosted Instances'
            }, {
                name: 'maxRemoteInstances',
                type: 'number',
                default: tierDefaults.remote,
                message: 'Max allowed Remote Instances'
            }, {
                name: 'maxMQTTClients',
                type: 'number',
                default: 20,
                message: 'Max allowed MQTT client'
            }, {
                name: 'notes',
                type: 'input',
                message: 'License notes'
            }, {
                name: 'validFrom',
                type: 'input',
                default: today,
                message: 'Valid from',
                validate (input) {
                    const date = new Date(input)
                    if (isNaN(date.getTime())) {
                        return 'Invalid start time'
                    }
                    return true
                },
                filter (input, hash) {
                    const date = new Date(input)
                    return Math.floor(date.getTime() / 1000)
                }
            }, {
                name: 'expiry',
                type: 'input',
                default: defaultExpire,
                message: 'Expire at',
                validate (input) {
                    const date = new Date(input)
                    if (isNaN(date.getTime())) {
                        return 'Invalid expire time'
                    }
                    return true
                },
                filter (input, hash) {
                    const date = new Date(input)
                    return Math.floor(date.getTime() / 1000)
                }
            }
        ])
        const answers = { ...initialAnswers, ...moreAnswers }
        const licenseDetails = {
            id: licenseId,
            // ver: '2024-03-04', // Used to determined the format of the license.
            ver: '2026-08-20', // Used to determined the format of the license.
            iss: 'FlowForge Inc.', // DO NOT CHANGE
            sub: answers.licenseHolder, // Name of the license holder
            nbf: answers.validFrom,
            exp: answers.expiry, // Expiry of the license in epoch seconds
            note: answers.licenseNotes, // Freeform text to associate with license
            users: answers.maxUsers,
            teams: answers.maxTeams,
            projects: answers.maxHostedInstances,
            devices: answers.maxRemoteInstances,
            mqttClients: answers.maxMQTTClients,
            tiers: answers.tiers // licenseTier
        }

        const keyQuestions = []

        if (answers.devLicense) {
            licenseDetails.dev = true
            // Use DEFAULT_DEV_KEY_FILENAME
        } else {
            // Prompt for the private key filename and password to use for signing the license
            keyQuestions.push({
                name: 'key',
                type: 'input',
                default: DEFAULT_PROD_KEY_FILENAME,
                message: 'Production license private key filename',
                validate (input) {
                    if (!fs.existsSync(input)) {
                        return true
                    }
                    return false
                },
                filter (input, answers) {
                    return fs.readFileSync(input)
                }
            })
        }

        keyQuestions.push({
            name: 'passphrase',
            type: 'password',
            mask: true,
            message: 'Password for private key'
        })

        const keyAnswers = await inquirer.prompt(keyQuestions)
        const key = keyAnswers.key ? keyAnswers.key : fs.readFileSync(DEFAULT_DEV_KEY_FILENAME)

        const licenseText = jwt.sign(
            licenseDetails,
            { key, passphrase: keyAnswers.passphrase },
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
        console.info(err)
    }
})()
