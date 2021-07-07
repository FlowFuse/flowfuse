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

;(async function() {
        await sequelize.authenticate();
        await Models.init(db);
        await Views.init(db);
        await Controllers.init(db);

        const user1 = await Models.User.create({admin: true, name: "Alice Avery", email: "alice@example.com", password: 'aaPassword'});
        const user2 = await Models.User.create({name: "Bob Block", email: "bob@example.com", password: 'bbPassword'});
        const user3 = await Models.User.create({name: "Chris Connors", email: "chris@example.com", password: 'ccPassword'});

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
