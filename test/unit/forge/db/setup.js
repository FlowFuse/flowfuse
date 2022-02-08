const FF_UTIL = require('flowforge-test-utils')
const Forge = FF_UTIL.require('forge/forge.js')
const { Roles } = FF_UTIL.require('forge/lib/roles')
const { LocalTransport } = require('flowforge-test-utils/forge/postoffice/localTransport.js')

module.exports = async function (settings = {}, config = {}) {
    config = {
        ...config,
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

    /*
        alice (admin)
        bob
        chris (!email_verified)

        ATeam - alice(owner), bob(member)
        BTeam - bob(owner), alice(member)
        CTeam - alice(owner)
    */
    await forge.db.models.PlatformSettings.upsert({ key: 'setup:initialised', value: true })
    const userAlice = await forge.db.models.User.create({ admin: true, username: 'alice', name: 'Alice Skywalker', email: 'alice@example.com', email_verified: true, password: 'aaPassword' })
    const userBob = await forge.db.models.User.create({ username: 'bob', name: 'Bob Solo', email: 'bob@example.com', email_verified: true, password: 'bbPassword' })
    /* const userChris = */ await forge.db.models.User.create({ username: 'chris', name: 'Chris Kenobi', email: 'chris@example.com', password: 'ccPassword' })
    const team1 = await forge.db.models.Team.create({ name: 'ATeam' })
    const team2 = await forge.db.models.Team.create({ name: 'BTeam' })
    const team3 = await forge.db.models.Team.create({ name: 'CTeam' })
    await team1.addUser(userAlice, { through: { role: Roles.Owner } })
    await team1.addUser(userBob, { through: { role: Roles.Member } })
    await team2.addUser(userBob, { through: { role: Roles.Owner } })
    await team2.addUser(userAlice, { through: { role: Roles.Owner } })
    await team3.addUser(userAlice, { through: { role: Roles.Owner } })
    return forge
}
