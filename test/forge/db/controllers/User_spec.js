const should = require("should");
const setup = require("../setup");

describe("User controller", function() {
    // Use standard test data.
    let app;
    beforeEach(async function() {
        app = await setup();
    })

    describe("authenticateCredentials", function() {
        it("returns true for a valid username/password", async function() {
            const result = await app.db.controllers.User.authenticateCredentials("alice","aaPassword")
            result.should.be.true();
        })

        it("returns false for valid username/invalid password", async function() {
            const result = await app.db.controllers.User.authenticateCredentials("alice","invalid")
            result.should.be.false();
        })

        it("returns false for invalid username/password", async function() {
            const result = await app.db.controllers.User.authenticateCredentials("invalid","invalid")
            result.should.be.false();
        })
    });

    describe("changePassword", function() {
        it("changes a users password", async function() {
            const user = await app.db.models.User.byUsername("alice");
            const initialPasswordCheck = await app.db.controllers.User.authenticateCredentials("alice","aaPassword")
            initialPasswordCheck.should.be.true();
            await app.db.controllers.User.changePassword(user, "aaPassword", "aNewPassword");
            user.password.should.not.equal("aaPassword");
            user.password.should.not.equal("aNewPassword");
            const finalPasswordCheck = await app.db.controllers.User.authenticateCredentials("alice","aNewPassword")
            finalPasswordCheck.should.be.true();
        })
        it("fails if existing password not provided", async function() {
            const user = await app.db.models.User.byUsername("alice");
            try {
                await app.db.controllers.User.changePassword(user, "invalidPassword", "aNewPassword");
            } catch(err) {
                // Check the password hasn't changed
                const initialPasswordCheck = await app.db.controllers.User.authenticateCredentials("alice","aaPassword")
                initialPasswordCheck.should.be.true();
                return;
            }
            throw new Error("Password changed with invalid oldPassword")
        })
    });
})
