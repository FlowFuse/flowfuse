const FF_UTIL = require('flowforge-test-utils')
const { Roles } = FF_UTIL.require('forge/lib/roles')

// Lots of dupication between the different unit test setup.js files
// Should pull out the common bits to one place

module.exports = async function (config = {}) {
    config.housekeeper = config.housekeeper || false
    const forge = await FF_UTIL.setupApp(config)
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
    const defaultTeamType = await forge.db.models.TeamType.byName('starter')
    const team1 = await forge.db.models.Team.create({ name: 'ATeam', TeamTypeId: defaultTeamType.id })
    const team2 = await forge.db.models.Team.create({ name: 'BTeam', TeamTypeId: defaultTeamType.id })
    const team3 = await forge.db.models.Team.create({ name: 'CTeam', TeamTypeId: defaultTeamType.id })
    await team1.addUser(userAlice, { through: { role: Roles.Owner } })
    await team1.addUser(userBob, { through: { role: Roles.Member } })
    await team2.addUser(userBob, { through: { role: Roles.Owner } })
    await team2.addUser(userAlice, { through: { role: Roles.Owner } })
    await team3.addUser(userAlice, { through: { role: Roles.Owner } })
    return forge
}
