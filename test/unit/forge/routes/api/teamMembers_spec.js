const should = require('should') // eslint-disable-line
const setup = require('../setup')
const FF_UTIL = require('flowforge-test-utils')
const { Roles } = FF_UTIL.require('forge/lib/roles')

describe('Team Members API', function () {
    let app
    const TestObjects = {}
    beforeEach(async function () {
        app = await setup()

        // alice : admin
        // bob
        // chris

        // ATeam ( alice  (owner), bob (owner), chris)
        // BTeam ( bob (owner), chris)
        // CTeam ( chris (owner) )

        // Alice create in setup()
        TestObjects.alice = await app.db.models.User.byUsername('alice')
        TestObjects.bob = await app.db.models.User.create({ username: 'bob', name: 'Bob Solo', email: 'bob@example.com', email_verified: true, password: 'bbPassword' })
        TestObjects.chris = await app.db.models.User.create({ username: 'chris', name: 'Chris Kenobi', email: 'chris@example.com', email_verified: true, password: 'ccPassword' })

        // ATeam create in setup()
        TestObjects.ATeam = await app.db.models.Team.byName('ATeam')
        TestObjects.BTeam = await app.db.models.Team.create({ name: 'BTeam', TeamTypeId: app.defaultTeamType.id })
        TestObjects.CTeam = await app.db.models.Team.create({ name: 'CTeam', TeamTypeId: app.defaultTeamType.id })

        // Alice set as ATeam owner in setup()
        await TestObjects.ATeam.addUser(TestObjects.bob, { through: { role: Roles.Owner } })
        await TestObjects.ATeam.addUser(TestObjects.chris, { through: { role: Roles.Member } })
        await TestObjects.BTeam.addUser(TestObjects.bob, { through: { role: Roles.Owner } })
        await TestObjects.BTeam.addUser(TestObjects.chris, { through: { role: Roles.Member } })
        await TestObjects.CTeam.addUser(TestObjects.chris, { through: { role: Roles.Owner } })

        await TestObjects.chris.setDefaultTeam(TestObjects.ATeam)

        TestObjects.tokens = {}
        await login('alice', 'aaPassword')
        await login('bob', 'bbPassword')
        await login('chris', 'ccPassword')
    })

    async function login (username, password) {
        const response = await app.inject({
            method: 'POST',
            url: '/account/login',
            payload: { username, password, remember: false }
        })
        response.cookies.should.have.length(1)
        response.cookies[0].should.have.property('name', 'sid')
        TestObjects.tokens[username] = response.cookies[0].value
    }

    afterEach(async function () {
        await app.close()
    })

    function verifyMembers (result, expectedMembers) {
        result.should.have.property('count', expectedMembers.length)
        result.should.have.property('members')
        result.members.should.have.lengthOf(expectedMembers.length)
        for (let i = 0; i < expectedMembers.length; i++) {
            result.members[i].should.have.property('id', expectedMembers[i].id)
            result.members[i].should.have.property('role', expectedMembers[i].role)
        }
    }

    describe('List team members', async function () {
        // GET /api/v1/teams/:teamId/members

        it('team owner, non-admin', async function () {
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${TestObjects.BTeam.hashid}/members`,
                cookies: { sid: TestObjects.tokens.bob }
            })
            const result = response.json()
            verifyMembers(result, [
                { id: TestObjects.bob.hashid, role: Roles.Owner },
                { id: TestObjects.chris.hashid, role: Roles.Member }
            ])
        })

        it('team member, non-admin', async function () {
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${TestObjects.BTeam.hashid}/members`,
                cookies: { sid: TestObjects.tokens.chris }
            })
            const result = response.json()
            verifyMembers(result, [
                { id: TestObjects.bob.hashid, role: Roles.Owner },
                { id: TestObjects.chris.hashid, role: Roles.Member }
            ])
        })

        it('non-team member, admin', async function () {
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${TestObjects.BTeam.hashid}/members`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            const result = response.json()
            verifyMembers(result, [
                { id: TestObjects.bob.hashid, role: Roles.Owner },
                { id: TestObjects.chris.hashid, role: Roles.Member }
            ])
        })

        it('non-team member, non-admin should 404', async function () {
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${TestObjects.CTeam.hashid}/members`,
                cookies: { sid: TestObjects.tokens.bob }
            })
            response.statusCode.should.eql(404)
        })
    })

    describe('Add team member', async function () {
        // POST /api/v1/teams/:teamId/members
        // Endpoint not implemented
    })

    describe('Remove team member', async function () {
        // DELETE /api/v1/teams/:teamId/members/:userId

        it('owner can remove member', async function () {
            // Alice remove Chris from ATeam
            // - also checks that Chris's defaultTeam is cleared as they
            //   are no longer a member of the team
            TestObjects.chris.should.have.property('defaultTeamId', TestObjects.ATeam.id)
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/teams/${TestObjects.ATeam.hashid}/members/${TestObjects.chris.hashid}`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)

            await TestObjects.chris.reload()
            // Verify Chris' defaultTeam is no longer ATeam
            TestObjects.chris.should.have.property('defaultTeamId', null)
            const checkMemberList = await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${TestObjects.ATeam.hashid}/members`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            verifyMembers(checkMemberList.json(), [
                { id: TestObjects.alice.hashid, role: Roles.Owner },
                { id: TestObjects.bob.hashid, role: Roles.Owner }
            ])
        })

        it('owner can remove other owner', async function () {
            // Alice remove Bob from ATeam
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/teams/${TestObjects.ATeam.hashid}/members/${TestObjects.bob.hashid}`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)

            const checkMemberList = await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${TestObjects.ATeam.hashid}/members`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            verifyMembers(checkMemberList.json(), [
                { id: TestObjects.alice.hashid, role: Roles.Owner },
                { id: TestObjects.chris.hashid, role: Roles.Member }
            ])
        })

        it('member cannot remove user', async function () {
            // Chris fails to remove Bob from ATeam
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/teams/${TestObjects.ATeam.hashid}/members/${TestObjects.bob.hashid}`,
                cookies: { sid: TestObjects.tokens.chris }
            })
            response.statusCode.should.equal(403)
        })

        it('admin (non-member) can remove member', async function () {
            // Alice remove Chris from BTeam
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/teams/${TestObjects.BTeam.hashid}/members/${TestObjects.chris.hashid}`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)
            const checkMemberList = await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${TestObjects.BTeam.hashid}/members`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            verifyMembers(checkMemberList.json(), [
                { id: TestObjects.bob.hashid, role: Roles.Owner }
            ])
        })

        it('non-admin non-member cannot remove member', async function () {
            await app.db.models.User.create({ username: 'dave', name: 'Dave Vader', email: 'dave@example.com', password: 'ddPassword' })
            await ('dave', 'ddPassword')

            // Dave cannot remove Chris from BTeam
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/teams/${TestObjects.BTeam.hashid}/members/${TestObjects.chris.hashid}`,
                cookies: { sid: TestObjects.tokens.dave }
            })
            response.statusCode.should.equal(401)
        })

        it('owner can remove self if another owner exists', async function () {
            // Alice remove Alice from ATeam
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/teams/${TestObjects.ATeam.hashid}/members/${TestObjects.alice.hashid}`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)

            const checkMemberList = await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${TestObjects.ATeam.hashid}/members`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            verifyMembers(checkMemberList.json(), [
                { id: TestObjects.bob.hashid, role: Roles.Owner },
                { id: TestObjects.chris.hashid, role: Roles.Member }
            ])
        })

        it('owner cannot remove self if only owner', async function () {
            // Bob cannot remove Bob from BTeam
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/teams/${TestObjects.BTeam.hashid}/members/${TestObjects.bob.hashid}`,
                cookies: { sid: TestObjects.tokens.bob }
            })
            response.statusCode.should.equal(400)
        })

        it('admin cannot remove only owner from team', async function () {
            // Alice cannot remove Bob from BTeam
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/teams/${TestObjects.BTeam.hashid}/members/${TestObjects.bob.hashid}`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(400)
        })
    })

    describe('Change team member role', async function () {
        // PUT /api/v1/teams/:teamId/members/:userId

        it('owner can change member to owner', async function () {
            // Bob changes Chris to BTeam owner
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/teams/${TestObjects.BTeam.hashid}/members/${TestObjects.chris.hashid}`,
                cookies: { sid: TestObjects.tokens.bob },
                payload: {
                    role: Roles.Owner
                }
            })
            response.statusCode.should.equal(200)

            const checkMemberList = await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${TestObjects.BTeam.hashid}/members`,
                cookies: { sid: TestObjects.tokens.bob }
            })
            verifyMembers(checkMemberList.json(), [
                { id: TestObjects.bob.hashid, role: Roles.Owner },
                { id: TestObjects.chris.hashid, role: Roles.Owner }
            ])
        })

        it('owner can change 2nd owner to member', async function () {
            // Alice changes Bob to ATeam member
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/teams/${TestObjects.ATeam.hashid}/members/${TestObjects.bob.hashid}`,
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    role: Roles.Member
                }
            })
            response.statusCode.should.equal(200)

            const checkMemberList = await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${TestObjects.ATeam.hashid}/members`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            verifyMembers(checkMemberList.json(), [
                { id: TestObjects.alice.hashid, role: Roles.Owner },
                { id: TestObjects.bob.hashid, role: Roles.Member },
                { id: TestObjects.chris.hashid, role: Roles.Member }
            ])
        })
        it('owner can change own role to member if 2nd owner exists', async function () {
            // Alice changes Alice to ATeam member
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/teams/${TestObjects.ATeam.hashid}/members/${TestObjects.alice.hashid}`,
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    role: Roles.Member
                }
            })
            response.statusCode.should.equal(200)

            const checkMemberList = await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${TestObjects.ATeam.hashid}/members`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            verifyMembers(checkMemberList.json(), [
                { id: TestObjects.alice.hashid, role: Roles.Member },
                { id: TestObjects.bob.hashid, role: Roles.Owner },
                { id: TestObjects.chris.hashid, role: Roles.Member }
            ])
        })
        it('owner cannot change own role to member if no 2nd owner exists', async function () {
            // Bob cannot change self to member of BTeam
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/teams/${TestObjects.BTeam.hashid}/members/${TestObjects.bob.hashid}`,
                cookies: { sid: TestObjects.tokens.bob },
                payload: {
                    role: Roles.Member
                }
            })
            response.statusCode.should.equal(403)
        })
        it('member cannot change own role to owner', async function () {
            // Chris cannot change self to owner of BTeam
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/teams/${TestObjects.BTeam.hashid}/members/${TestObjects.chris.hashid}`,
                cookies: { sid: TestObjects.tokens.chris },
                payload: {
                    role: Roles.Owner
                }
            })
            response.statusCode.should.equal(403)
        })
        it('member cannot change other member role', async function () {
            // Alice changes Bob to Member - then Bob tries to change Chris to Owner
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/teams/${TestObjects.ATeam.hashid}/members/${TestObjects.bob.hashid}`,
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    role: Roles.Member
                }
            })
            response.statusCode.should.equal(200)

            const response2 = await app.inject({
                method: 'PUT',
                url: `/api/v1/teams/${TestObjects.ATeam.hashid}/members/${TestObjects.chris.hashid}`,
                cookies: { sid: TestObjects.tokens.bob },
                payload: {
                    role: Roles.Owner
                }
            })
            response2.statusCode.should.equal(403)
        })

        it('admin can change member to owner', async function () {
            // Alice changes Chris to BTeam owner
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/teams/${TestObjects.BTeam.hashid}/members/${TestObjects.chris.hashid}`,
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    role: Roles.Owner
                }
            })
            response.statusCode.should.equal(200)

            const checkMemberList = await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${TestObjects.BTeam.hashid}/members`,
                cookies: { sid: TestObjects.tokens.bob }
            })
            verifyMembers(checkMemberList.json(), [
                { id: TestObjects.bob.hashid, role: Roles.Owner },
                { id: TestObjects.chris.hashid, role: Roles.Owner }
            ])
        })
        it('admin can change owner to member if 2nd owner exists', async function () {
            // First set Chris as BTeam owner - then check Alice can make Bob member
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/teams/${TestObjects.BTeam.hashid}/members/${TestObjects.chris.hashid}`,
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    role: Roles.Owner
                }
            })
            response.statusCode.should.equal(200)

            const response2 = await app.inject({
                method: 'PUT',
                url: `/api/v1/teams/${TestObjects.BTeam.hashid}/members/${TestObjects.bob.hashid}`,
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    role: Roles.Member
                }
            })
            response2.statusCode.should.equal(200)
            const checkMemberList = await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${TestObjects.BTeam.hashid}/members`,
                cookies: { sid: TestObjects.tokens.bob }
            })
            verifyMembers(checkMemberList.json(), [
                { id: TestObjects.bob.hashid, role: Roles.Member },
                { id: TestObjects.chris.hashid, role: Roles.Owner }
            ])
        })
        it('admin cannot change owner to member if no 2nd owner exists', async function () {
            // Alice cannot change Bob to member of BTeam
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/teams/${TestObjects.BTeam.hashid}/members/${TestObjects.bob.hashid}`,
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    role: Roles.Member
                }
            })
            response.statusCode.should.equal(403)
        })

        it('non-admin non-member cannot modify member', async function () {
            await app.db.models.User.create({ username: 'dave', name: 'Dave Vader', email: 'dave@example.com', password: 'ddPassword' })
            await ('dave', 'ddPassword')

            // Dave cannot make Chris owner of BTeam
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/teams/${TestObjects.BTeam.hashid}/members/${TestObjects.chris.hashid}`,
                cookies: { sid: TestObjects.tokens.dave },
                payload: {
                    role: Roles.Owner
                }
            })
            response.statusCode.should.equal(401)
        })
    })
})
