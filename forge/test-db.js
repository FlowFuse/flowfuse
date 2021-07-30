/**
 * A bunch of quick tests of the model to help validate stuff without the full
 * apis in place.
 *
 * No substitute for proper tests....
 */

const { Sequelize } = require('sequelize');
const Models = require("./db/models");
const Views = require("./db/views");
const Controllers = require("./db/controllers");

const sequelize = new Sequelize('sqlite::memory:',{
    logging: false
})

const db = {
    sequelize,
    models: Models,
    views: Views,
    controllers: Controllers
}

const R = async function(f) { console.log(JSON.stringify(await f," ",4)); }

async function setup() {
    await sequelize.authenticate();
    await Models.init(db);
    await Views.init(db);
    await Controllers.init(db);

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

    const project1 = await Models.Project.create({name: "project1", type: "basic", url: "http://instance1.example.com"});
    const project2 = await Models.Project.create({name: "project2", type: "basic", url: "http://instance2.example.com"});

    await team1.addProject(project1);
    await team2.addProject(project2);
}

if (require.main === module) {
    // Being run directly
    (async function() {
        await setup();
        try {
            let user = await Models.User.findOne({
                where: { email:'alice@example.com'}
            });
            await Controllers.User.changePassword(user, "aaPassword", "newPassword");
        }catch(err) {
            console.log(err);
        }
        // let result = await Models.Session.findAll({
        //     include: Models.User
        // });


        //
        // let result = await Models.User.findOne({
        //     where: { email:'alice@example.com'}
        // });

        // let result = await Models.Team.findOne({where: {name:"ATeam"}, include:{
        //     model:sequelize.models.User,
        //     attributes:['name'],
        //     through: {
        //         model:sequelize.models.TeamMember.scope('owners'),
        //         attributes:['role']
        //     }
        // }});


        // let result = await Models.TeamMember.scope("owners").findAll({include:{
        //     model:sequelize.models.User,
        //     attributes:['name'],
        // }});

        // let result = await Models.User.byName("Alice");
        // let result = await Models.User.admins()
        // let result = await Models.User.inTeam("BTeam")
        // let result = (await Models.Team.byName('ATeam')).members('owner');


        // R(result);
    })().catch(e => {
        console.log(e);
    }).finally( () => {
        try { sequelize.close() } catch(err) {}
    });
} else {
    module.exports = {
        db,
        R,
        setup
    }
}
