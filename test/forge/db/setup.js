
const fastify = require('fastify');
const db = require('../../../forge/db');



module.exports = async function() {
    const app = fastify()

    process.env.DB_TYPE = "sqlite";
    process.env.DP_SQLITE_STORAGE = ":memory:"
    await app.register(db);

    /*
        alice (admin)
        bob
        chris (!email_verified)

        ATeam - alice(owner), bob(member)
        BTeam - bob(owner), alice(member)
        CTeam - alice(owner)
    */

    await app.db.models.PlatformSettings.upsert({ key: "setup:initialised",value:true });
    const userAlice = await app.db.models.User.create({admin: true, username: "alice", name: "Alice Skywalker", email: "alice@example.com", email_verified: true, password: 'aaPassword'});
    const userBob = await app.db.models.User.create({username: "bob", name: "Bob Solo", email: "bob@example.com", email_verified: true,password: 'bbPassword'});
    const userChris = await app.db.models.User.create({username: "chris", name: "Chris Kenobi", email: "chris@example.com", password: 'ccPassword'});
    const team1 = await app.db.models.Team.create({name: "ATeam"});
    const team2 = await app.db.models.Team.create({name: "BTeam"});
    const team3 = await app.db.models.Team.create({name: "CTeam"});
    await team1.addUser(userAlice, { through: { role:"owner" } });
    await team1.addUser(userBob, { through: { role:"member" } });
    await team2.addUser(userBob, { through: { role:"owner" } });
    await team2.addUser(userAlice, { through: { role:"member" } });
    await team3.addUser(userAlice, { through: { role:"owner" } });

    return app;
}
