const should = require("should");
const setup = require("../setup");

describe("User model", function() {
    // Use standard test data.
    let app;
    beforeEach(async function() {
        app = await setup();

    })
    it("User.admins returns all admin users", async function() {
        const admins = await app.db.models.User.admins();
        admins.should.have.length(1);
        admins[0].get('email').should.eql('alice@example.com')
    })

    it("getTeamMembership", async function() {
        const user = await app.db.models.User.byEmail("bob@example.com");
        const team1 = await app.db.models.Team.findOne({where: {name: "ATeam"}});
        const team2 = await app.db.models.Team.findOne({where: {name: "BTeam"}});
        const team3 = await app.db.models.Team.findOne({where: {name: "CTeam"}});

        const membership1 = await user.getTeamMembership(team1.id);
        should.equal(membership1.role,"member");
        should.equal(membership1.TeamId,team1.id);
        should.exist(membership1.Team);
        should.equal(membership1.Team.id,team1.id);
        should.equal(membership1.Team.name,"ATeam");

        const membership2 = await user.getTeamMembership(team2.id);
        should.equal(membership2.role,"owner");

        const membership3 = await user.getTeamMembership(team3.id);
        should.not.exist(membership3);
    });


    // it("random", async function() {
    //     const user = await app.db.models.User.byEmail("chris@example.com");
    //     const proj = await app.db.models.Project.findOne({where:{name:"project2"}});
    //     const membership = await user.getTeamMembership(proj.TeamId);
    //     console.log(user.name, proj.name, membership.role);
    // })

    // it("User.inTeam returns all users in a team", async function() {
    //     const team1Members = await app.db.models.User.inTeam('ATeam');
    //     team1Members.should.have.length(3);
    //
    //     console.log(team1Members[0].get('Teams'));
    //
    //     const team2Members = await app.db.models.User.inTeam('BTeam');
    //     team2Members.should.have.length(2);
    //
    //     const team3Members = await app.db.models.User.inTeam('CTeam');
    //     team3Members.should.have.length(2);
    // })
})
