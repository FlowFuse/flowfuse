const should = require("should");
const setup = require("../setup");

describe("Team controller", function() {
    // Use standard test data.
    let app;
    beforeEach(async function() {
        app = await setup();
    })

    describe("change member role", function() {
        it("changes a users role from member to owner", async function() {
            const team = await app.db.models.Team.byName("ATeam");
            const user = await app.db.models.User.byUsername("bob");
            const startingRole = await user.getTeamMembership(team.id);
            startingRole.role.should.equal("member");
            await app.db.controllers.Team.changeUserRole(team.hashid, user.hashid, "owner")
            const endingRole = await user.getTeamMembership(team.id);
            endingRole.role.should.equal("owner");
        })
        it("changes a users role from owner to member", async function() {
            // only if there are >1 owner
            const team = await app.db.models.Team.byName("BTeam");
            const user = await app.db.models.User.byUsername("bob");
            const startingRole = await user.getTeamMembership(team.id);
            startingRole.role.should.equal("owner");
            await app.db.controllers.Team.changeUserRole(team.hashid, user.hashid, "member")
            const endingRole = await user.getTeamMembership(team.id);
            endingRole.role.should.equal("member");
        })

        it("does not allow a team to be left without an owner", async function() {
            const team = await app.db.models.Team.byName("ATeam");
            const user = await app.db.models.User.byUsername("alice");
            const startingRole = await user.getTeamMembership(team.id);
            startingRole.role.should.equal("owner");
            try {
                app.db.controllers.Team.changeUserRole(team.hashid, user.hashid, "member")
            } catch(err) {
                // TODO: check the error code
                return;
            }
            new Error("Allowed last owner to be removed")
        })
    })

    describe("remove from team", function() {
        // removeUser(team, userOrHashId, userRole)

        it("removes a user from a team", async function() {
            const team = await app.db.models.Team.byName("ATeam");
            const user = await app.db.models.User.byUsername("bob");
            const startingRole = await user.getTeamMembership(team.id);
            startingRole.role.should.equal("member");

            await app.db.controllers.Team.removeUser(team, user);

            const endingRole = await user.getTeamMembership(team.id);
            should.not.exist(endingRole);
        })
        it("removes an owner from a team", async function() {
            const team = await app.db.models.Team.byName("BTeam");
            const user = await app.db.models.User.byUsername("bob");
            const startingRole = await user.getTeamMembership(team.id);
            startingRole.role.should.equal("owner");

            await app.db.controllers.Team.removeUser(team, user);

            const endingRole = await user.getTeamMembership(team.id);
            should.not.exist(endingRole);
        })

        it("removes a user from a team - passing in user/role", async function() {
            // This is an optimisation in the code that saves looking up the
            // session user/role twice.
            const team = await app.db.models.Team.byName("ATeam");
            const user = await app.db.models.User.byUsername("bob");
            const startingRole = await user.getTeamMembership(team.id);
            startingRole.role.should.equal("member");
            await app.db.controllers.Team.removeUser(team, user, startingRole);
            const endingRole = await user.getTeamMembership(team.id);
            should.not.exist(endingRole);
        })

        it("does not allow a team to be left without an owner", async function() {
            const team = await app.db.models.Team.byName("ATeam");
            const user = await app.db.models.User.byUsername("alice");
            try {
                await app.db.controllers.Team.removeUser(team, user.hashid);
            } catch(err) {
                // TODO: check the error code
                return;
            }
            new Error("Allowed last owner to be removed")
        })
        it("does not allow a team to be left without an owner - passing in user/role", async function() {
            const team = await app.db.models.Team.byName("ATeam");
            const user = await app.db.models.User.byUsername("alice");
            const startingRole = await user.getTeamMembership(team.id);
            try {
                await app.db.controllers.Team.removeUser(team, user, startingRole);
            } catch(err) {
                // TODO: check the error code
                return;
            }
            new Error("Allowed last owner to be removed")
        })
    })
})
