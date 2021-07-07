// Injects some test data into the database

const Models = require("./models");

async function inject() {
    try {
        const user1 = await Models.User.create({admin: true, name: "Alice Skywalker", email: "alice@example.com", password: 'aaPassword'});
        const user2 = await Models.User.create({name: "Bob Solo", email: "bob@example.com", password: 'bbPassword'});
        const user3 = await Models.User.create({name: "Chris Kenobi", email: "chris@example.com", password: 'ccPassword'});

        const team1 = await Models.Team.create({name: "ATeam"});
        const team2 = await Models.Team.create({name: "BTeam"});
        const team3 = await Models.Team.create({name: "CTeam"});

        await team1.addUser(user1, { through: { role:"owner" } });
        await team1.addUser(user2, { through: { role:"member" } });
        await team1.addUser(user3, { through: { role:"member" } });

        await team2.addUser(user2, { through: { role:"owner" } });
        await team2.addUser(user1, { through: { role:"member" } });

        await team3.addUser(user1, { through: { role:"owner" } });
        await team3.addUser(user3, { through: { role:"member" } });

    } catch(err) {
        if (err.name === "SequelizeUniqueConstraintError") {
            // looks like the test data is already there
        } else {
            throw err
        }
    }
}

module.exports = {
    inject
}
