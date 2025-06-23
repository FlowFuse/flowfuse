/* eslint-disable n/no-process-exit */
'use strict'

const fs = require('fs')

const path = require('path')

const yaml = require('yaml')

const TestModelFactory = require('../../lib/TestModelFactory')

const app = require('./environments/standard')

const FF_UTIL = require('flowforge-test-utils')
const { Roles } = FF_UTIL.require('forge/lib/roles')

const configPath = path.join(process.cwd(), 'etc', 'flowforge.local.yml')
let e2eConfig = null

if (fs.existsSync(configPath)) {
    const configFile = fs.readFileSync(configPath, 'utf8')
    e2eConfig = yaml.parse(configFile).e2e
}

;(async function () {
    const PORT = 3002
    let emailConfig

    if (e2eConfig && e2eConfig.email && e2eConfig.email.ee && e2eConfig.email.ee.enabled) {
        const smtp = require('./environments/smtp')

        await smtp({
            smtpPort: e2eConfig.email.ee.smtp.port,
            webPort: e2eConfig.email.ee.smtp.web_port
        })
        emailConfig = e2eConfig.email.ee
    } else {
        emailConfig = {
            enabled: true,
            debug: true,
            smtp: {
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT,
                secure: false,
                debug: true
            }
        }
    }

    const flowforge = await app({
        trialMode: true
    }, {
        license: 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGb3JnZSBJbmMuIERldmVsb3BtZW50IiwibmJmIjoxNjYyNDIyNDAwLCJleHAiOjc5ODY5MDIzOTksIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxNTAsInRlYW1zIjo1MCwicHJvamVjdHMiOjUwLCJkZXZpY2VzIjo1MCwiZGV2Ijp0cnVlLCJpYXQiOjE2NjI0ODI5ODd9.e8Jeppq4aURwWYz-rEpnXs9RY2Y7HF7LJ6rMtMZWdw2Xls6-iyaiKV1TyzQw5sUBAhdUSZxgtiFH5e_cNJgrUg',
        host: 'localhost',
        port: PORT,
        billing: {
            stripe: {
                key: 1234,
                team_product: 'defaultteamprod',
                team_price: 'defaultteamprice',
                new_customer_free_credit: 1000,
                teams: {
                    starter: {
                        product: 'starterteamprod',
                        price: 'starterteampprice'
                    }
                }
            }
        },
        email: emailConfig,
        broker: {
            url: ':test:',
            teamBroker: {
                enabled: true
            }
        },
        npmRegistry: {
            enabled: true,
            url: 'http://localhost:4873',
            admin: {
                username: 'admin',
                password: 'secret'
            }
        }
    })

    const factory = new TestModelFactory(flowforge)

    // Enable Device Group feature for default team type
    const defaultTeamType = await flowforge.db.models.TeamType.findOne({ where: { name: 'starter' } })
    const defaultTeamTypeProperties = defaultTeamType.properties
    defaultTeamTypeProperties.features.npm = true
    defaultTeamTypeProperties.features.deviceGroups = true
    defaultTeamTypeProperties.features.protectedInstance = true
    defaultTeamTypeProperties.features.teamHttpSecurity = true
    defaultTeamType.properties = defaultTeamTypeProperties
    await defaultTeamType.save()

    // setup team
    const trialTeam = await factory.createTeam({ name: 'TTeam' })
    // create trial subscription for the team
    await factory.createTrialSubscription(trialTeam, 5)

    // setup user
    const userTerry = await factory.createUser({ username: 'terry', name: 'Terry Organa', email: 'terry@example.com', password: 'ttPassword', email_verified: true, password_expired: false })

    await trialTeam.addUser(userTerry, { through: { role: Roles.Owner } })
    // assign user to the trial team

    await factory.createTeamType({
        name: 'Second Team Type',
        description: 'team type description',
        active: true,
        order: 2,
        properties: { instances: {}, devices: {}, users: {}, features: {} }
    })

    // Enable the default instance type for this team type
    await factory.createTeamType({
        name: 'Third Team Type',
        description: 'team type description',
        active: true,
        order: 3,
        properties: {
            instances: { [flowforge.projectTypes[0].hashid]: { active: true } },
            devices: {},
            users: {},
            features: {}
        }
    })

    // Mimic the FF Cloud "Free" Team Type
    const userFreddie = await factory.createUser({ username: 'freddie', name: 'Freddie Fett', email: 'freddie@example.com', password: 'ffPassword', email_verified: true, password_expired: false })
    const freeTeamType = await factory.createTeamType({
        name: 'Free Team',
        description: 'team type description',
        active: true,
        order: 4,
        properties: {
            instances: { [flowforge.projectTypes[0].hashid]: { active: false } },
            devices: {},
            users: {},
            features: {},
            billing: {
                disabled: true
            }
        }
    })
    const freeTeam = await factory.createTeam({
        name: 'FFeam',
        TeamTypeId: freeTeamType.id
    })
    await factory.createSubscription(freeTeam)
    await freeTeam.addUser(userFreddie, { through: { role: Roles.Owner } })

    // create a snapshot on DeviceB
    const deviceB = flowforge.applicationDevices.find((device) => device.name === 'application-device-b')
    await factory.createDeviceSnapshot({ name: 'application-device-b snapshot 1' }, deviceB, userTerry)

    flowforge.listen({ port: PORT }, function (err, address) {
        console.info(`EE Environment running at http://localhost:${PORT}`)
        if (err) {
            console.error(err)
            process.exit(1)
        }
    })
})()
