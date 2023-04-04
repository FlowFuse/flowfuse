const TestModelFactory = require('../../../lib/TestModelFactory')

const FF_UTIL = require('flowforge-test-utils')
const Forge = FF_UTIL.require('forge/forge.js')
const { Roles } = FF_UTIL.require('forge/lib/roles')
const { LocalTransport } = require('flowforge-test-utils/forge/postoffice/localTransport.js')

module.exports = async function (settings = {}, config = {}) {
    config = {
        ...config,
        telemetry: { enabled: false },
        logging: {
            level: 'warn'
        },
        db: {
            type: 'sqlite',
            storage: ':memory:'
        },
        email: {
            enabled: true,
            transport: new LocalTransport()
        },
        driver: {
            type: 'stub'
        }
    }

    const forge = await Forge({ config })
    await forge.settings.set('setup:initialised', true)
    const factory = new TestModelFactory(forge)

    /// Create users
    // full platform & team1 admin
    const userAlice = await factory.createUser({ admin: true, username: 'alice', name: 'Alice Skywalker', email: 'alice@example.com', email_verified: true, password: 'aaPassword' })

    // team1 & team2 admin, not platform admin
    const userBob = await factory.createUser({ username: 'bob', name: 'Bob Solo', email: 'bob@example.com', email_verified: true, password: 'bbPassword' })

    // no admin rights
    // eslint-disable-next-line no-unused-vars
    const userCharlie = await factory.createUser({ username: 'charlie', name: 'Charlie Palpatine', email: 'charlie@example.com', email_verified: true, password: 'ccPassword' })

    // non admin, not in any team but will be invited and removed as required
    const userDave = await factory.createUser({ username: 'dave', name: 'Dave Vader', email: 'dave@example.com', password: 'ddPassword', email_verified: true, password_expired: false })

    // Platform Setup
    const template = await factory.createProjectTemplate({ name: 'template1' }, userAlice)
    const projectType = await factory.createProjectType({ name: 'type1' })
    const stack = await factory.createStack({ name: 'stack1' }, projectType)
    await factory.createStack({ name: 'stack2' }, projectType)

    // Unused templates and project types
    await factory.createProjectTemplate({ name: 'template2' }, userAlice)
    const spareProjectType = await factory.createProjectType({ name: 'type2' })
    await factory.createStack({ name: 'stack1-for-type2' }, spareProjectType)

    /// Team 1
    const team1 = await factory.createTeam({ name: 'ATeam' })
    await team1.addUser(userAlice, { through: { role: Roles.Owner } })
    await team1.addUser(userBob, { through: { role: Roles.Owner } })

    // Create a pending invite for Dave to join ATeam
    await factory.createInvitation(team1, userAlice, userDave)

    // Application and Instances
    const application1 = await factory.createApplication({ name: 'application-1' }, team1)
    await factory.createInstance({ name: 'instance-1-1' }, application1, stack, template, projectType)
    await factory.createInstance({ name: 'instance-1-2' }, application1, stack, template, projectType)

    /// Team 2
    const team2 = await factory.createTeam({ name: 'BTeam' })
    await team2.addUser(userBob, { through: { role: Roles.Owner } })

    // Create pending invite for Dave to join BTeam
    await factory.createInvitation(team2, userBob, userDave)

    // Unassigned devices
    await factory.createDevice({ name: 'team2-unassigned-device', type: 'type2' }, team2)

    // Application and Instances
    const application2 = await factory.createApplication({ name: 'application-2' }, team2, stack, template, projectType)
    await factory.createInstance({ name: 'instance-2-1' }, application2, stack, template, projectType)

    const instanceWithDevices = await factory.createInstance({ name: 'instance-2-with-devices' }, application2, stack, template, projectType)
    await factory.createDevice({ name: 'assigned-device-a', type: 'type2' }, team2, instanceWithDevices)
    await factory.createDevice({ name: 'assigned-device-b', type: 'type2' }, team2, instanceWithDevices)
    await factory.createDevice({ name: 'assigned-device-c', type: 'type2' }, team2, instanceWithDevices)
    await factory.createSnapshot({ name: 'snapshot 1' }, instanceWithDevices, userBob)
    await factory.createSnapshot({ name: 'snapshot 2' }, instanceWithDevices, userBob)
    await factory.createSnapshot({ name: 'snapshot 3' }, instanceWithDevices, userBob)

    return forge
}
