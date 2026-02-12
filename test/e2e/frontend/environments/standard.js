const TestModelFactory = require('../../../lib/TestModelFactory')
const StripeMock = require('../../../lib/stripeMock.js')

const multipleBlueprints = require('../cypress/fixtures/blueprints/multiple-blueprints.json')
const projectStackFactory = require('../lib/projectStackFactory.js')
const projectTemplateFactory = require('../lib/projectTemplateFactory.js')
const projectTypeFactory = require('../lib/projectTypeFactory.js')

const FF_UTIL = require('flowforge-test-utils')

const Forge = FF_UTIL.require('forge/forge.js')
const { Roles } = FF_UTIL.require('forge/lib/roles')

module.exports = async function (settings = {}, config = {}) {
    process.env.FF_TELEMETRY_DISABLED = true
    config = {
        telemetry: { enabled: false },
        logging: {
            level: 'warn'
        },
        db: {
            type: 'sqlite',
            storage: ':memory:'
        },
        driver: {
            type: 'stub'
        },
        // configure a broker so that device app.comms is loaded and can be stubbed
        broker: {
            url: ':test:'
        },
        blueprintImport: {
            enabled: false
        },
        ...config,
        tables: {
            enabled: true,
            driver: {
                type: 'stub'
            }
        }
    }

    // mock out stripe JS library
    if (config.billing) {
        StripeMock({
            teams: {
                starter: {
                    product: 'starterteamprod',
                    price: 'starterteampprice'
                }
            }
        })
    }

    const forge = await Forge({ config })
    await forge.settings.set('setup:initialised', true)
    forge.license.defaults.users = 50
    forge.license.defaults.teams = 50
    forge.license.defaults.instances = 50

    const factory = new TestModelFactory(forge)

    // Create users
    // full platform & team1 admin
    const userAlice = await factory.createUser({ admin: true, username: 'alice', name: 'Alice Skywalker', email: 'alice@example.com', email_verified: true, password: 'aaPassword' })

    // team1 & team2 admin, not platform admin
    const userBob = await factory.createUser({ username: 'bob', name: 'Bob Solo', email: 'bob@example.com', email_verified: true, password: 'bbPassword' })

    // no admin rights
    // eslint-disable-next-line no-unused-vars
    const userCharlie = await factory.createUser({ username: 'charlie', name: 'Charlie Palpatine', email: 'charlie@example.com', email_verified: true, password: 'ccPassword' })

    // non admin, not in any team but will be invited and removed as required
    const userDave = await factory.createUser({ username: 'dave', name: 'Dave Vader', email: 'dave@example.com', password: 'ddPassword', email_verified: true, password_expired: false })

    // team member
    const userEddy = await factory.createUser({ username: 'eddy', name: 'Edward Organa', email: 'eddy@example.com', email_verified: true, password: 'eePassword' })

    // disposable users for offboarding tests
    const userBoba = await factory.createUser({ username: 'boba', name: 'Boba Fett', email: 'boba@example.com', email_verified: true, password: 'ffPassword' })
    const userGrey = await factory.createUser({ username: 'grey', name: 'Grey Grevious', email: 'grey@example.com', email_verified: true, password: 'ggPassword' })

    // dashboard users
    const userDashboardDave = await factory.createUser({ username: 'dashboard-dave', name: 'Dashboard Dave', email: 'ddave@example.com', password: 'ddPassword', email_verified: true, password_expired: false })

    // initialize project types, templates and stacks
    const { type1: projectType, type2: spareProjectType } = await projectTypeFactory.init(forge)
    const { template1: template } = await projectTemplateFactory.init(forge, userAlice)
    const { stack1: stack, stack2 } = await projectStackFactory.init(forge)

    // Ensure projectTypes are allowed to be used by the default team type
    const teamType = await forge.db.models.TeamType.findOne({ where: { id: 1 } })
    const teamTypeProperties = { ...teamType.properties }
    teamTypeProperties.instances = {
        [projectType.hashid]: { active: true },
        [spareProjectType.hashid]: { active: true }
    }
    if (config.billing) {
        teamTypeProperties.instances[projectType.hashid].priceId = 'starterteampprice'
        teamTypeProperties.instances[projectType.hashid].productId = 'starterteamprod'
        teamTypeProperties.instances[projectType.hashid].description = '$15/month'
        teamTypeProperties.instances[spareProjectType.hashid].priceId = 'price2'
        teamTypeProperties.instances[spareProjectType.hashid].productId = 'product2'
        teamTypeProperties.instances[spareProjectType.hashid].description = '$10/month'
    }
    // configure trial mode
    if (settings.trialMode) {
        teamTypeProperties.trial = {
            active: true,
            duration: 5,
            instanceType: projectType.hashid
        }
    }
    if (config.email.enabled) {
        if (teamTypeProperties.features) {
            teamTypeProperties.features.emailAlerts = true
        } else {
            teamTypeProperties.features = {
                emailAlerts: true
            }
        }
    }

    if (forge.license.active()) {
        teamTypeProperties.features.teamBroker = true
        teamTypeProperties.features.tables = true
    }
    teamType.properties = teamTypeProperties
    await teamType.save()

    /// Team 1
    const team1 = await factory.createTeam({ name: 'ATeam' })
    await team1.addUser(userAlice, { through: { role: Roles.Owner } })
    await team1.addUser(userBob, { through: { role: Roles.Owner } })
    await team1.addUser(userDashboardDave, { through: { role: Roles.Dashboard } })

    // Create a pending invite for Dave to join ATeam
    await factory.createInvitation(team1, userAlice, userDave)

    // Add subscription to ATeam if Billing enabled
    // Must do this before Instance creation
    if (config.billing) {
        await factory.createSubscription(team1)
    }

    // Application and Instances
    const application1 = await factory.createApplication({ name: 'application-1' }, team1)
    await factory.createInstance({ name: 'instance-1-1' }, application1, stack, template, projectType, {
        settings: {
            palette: {
                modules: [
                    {
                        name: '@flowfuse/node-red-dashboard',
                        version: '~1.25.0',
                        local: true
                    }
                ]
            }
        }
    })
    await factory.createInstance({ name: 'instance-1-2' }, application1, stack2, template, projectType, {
        start: false,
        settings: {
            palette: {
                modules: [
                    {
                        name: '@flowfuse/node-red-dashboard',
                        version: '~1.25.0',
                        local: true
                    }
                ]
            }
        }
    })

    /// Team 2
    const team2 = await factory.createTeam({ name: 'BTeam' })
    await team2.addUser(userBob, { through: { role: Roles.Owner } })
    await team2.addUser(userEddy, { through: { role: Roles.Member } })
    await team2.addUser(userBoba, { through: { role: Roles.Member } })
    await team2.addUser(userGrey, { through: { role: Roles.Member } })

    // Create pending invite for Dave to join BTeam
    await factory.createInvitation(team2, userBob, userDave)

    // Add subscription to ATeam if Billing enabled
    if (config.billing) {
        await factory.createSubscription(team2)
    }

    // Unassigned devices
    await factory.createDevice({ name: 'team2-unassigned-device', type: 'type2', lastSeenAt: Date.now() }, team2)
    await factory.createDevice({ name: 'team2-unassigned-device-bulk-test-1', type: 'type2', lastSeenAt: Date.now() }, team2)

    // Application and Instances
    const application2 = await factory.createApplication({ name: 'application-2' }, team2, stack, template, projectType)
    await factory.createInstance({ name: 'instance-2-1' }, application2, stack, template, projectType)

    const instanceWithDevices = await factory.createInstance({ name: 'instance-2-with-devices' }, application2, stack, template, projectType, { start: false })
    await factory.createDevice({ name: 'assigned-device-a', type: 'type2', lastSeenAt: Date.now() }, team2, instanceWithDevices)
    await factory.createDevice({ name: 'assigned-device-b', type: 'type2', lastSeenAt: Date.now() }, team2, instanceWithDevices)
    await factory.createDevice({ name: 'assigned-device-c', type: 'type2', lastSeenAt: Date.now() }, team2, instanceWithDevices)
    await factory.createDevice({ name: 'assigned-device-d-bulk-test-2', type: 'type2', lastSeenAt: Date.now() }, team2, instanceWithDevices)
    await factory.createSnapshot({ name: 'snapshot 1' }, instanceWithDevices, userBob)
    await factory.createSnapshot({ name: 'snapshot 2' }, instanceWithDevices, userBob)
    await factory.createSnapshot({ name: 'snapshot 3' }, instanceWithDevices, userBob)

    // create devices bound to application directly
    const deviceA = await factory.createDevice({ name: 'application-device-a', type: 'type2', lastSeenAt: Date.now() }, team2, null, application2)
    const deviceB = await factory.createDevice({ name: 'application-device-b', type: 'type2', lastSeenAt: Date.now() }, team2, null, application2)
    await factory.createDevice({ name: 'application-device-c-bulk-test-3', type: 'type2', lastSeenAt: Date.now() }, team2, null, application2)

    // create a device group and add deviceB to it
    const deviceGroupA = await factory.createApplicationDeviceGroup({ name: 'application-device-group-a' }, application2)
    await factory.addDeviceToGroup(deviceB, deviceGroupA)

    if (forge.license.active()) {
        for (const blueprint of multipleBlueprints.blueprints) {
            await factory.createBlueprint(blueprint)
        }
    }

    forge.teams = [team1, team2]
    forge.projectTypes = [projectType, spareProjectType]
    forge.applicationDevices = [deviceA, deviceB]
    forge.applicationDeviceGroups = [deviceGroupA]
    return forge
}
