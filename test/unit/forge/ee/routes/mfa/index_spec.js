const should = require('should') // eslint-disable-line
const setup = require('../../setup')

describe('Users API - MFA', async function () {
    let app
    const TestObjects = {}

    before(async function () {
        const license = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGb3JnZSBJbmMuIERldmVsb3BtZW50IiwibmJmIjoxNjYyNTA4ODAwLCJleHAiOjc5ODY5ODg3OTksIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjo1LCJ0ZWFtcyI6NTAsInByb2plY3RzIjo1MCwiZGV2aWNlcyI6NTAsImRldiI6dHJ1ZSwiaWF0IjoxNjYyNTQ4NjAyfQ.vvSw6pm-NP5e0NUL7yMOG-w0AgB8H3NRGGN7b5Dw_iW5DiIBbVQ4HVLEi3dyy9fk7WgKnloiCCkIFJvN79fK_g'
        app = await setup({ license })
        TestObjects.mfaUser = await app.factory.createUser({
            admin: true,
            username: 'mfaUser',
            name: 'MFA User',
            email: 'mfa@example.com',
            password: 'mmPassword',
            mfa_enabled: 'true'
        })
        await app.db.models.MFAToken.createTokenForUser(TestObjects.mfaUser)

        TestObjects.alice = await app.db.models.User.byUsername('alice')

        TestObjects.tokens = {}
        await login('alice', 'aaPassword')
    })
    after(async function () {
        return app.close()
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

    describe('Update user settings', async function () {
        describe('Disable MFA on user', async function () {
            it('can disable mfa for a user', async function () {
                // Alice can clear mfaUser mfa status
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/users/${TestObjects.mfaUser.hashid}`,
                    payload: {
                        mfa_enabled: false
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(200)
                const result = response.json()
                result.should.have.property('mfa_enabled', false)

                const token = await app.db.models.MFAToken.forUser(TestObjects.mfaUser)
                should.not.exist(token)
            })

            it('cannot enable mfa for a user', async function () {
                // Alice cannot enable mfa on themselves via this api
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/users/${TestObjects.alice.hashid}`,
                    payload: {
                        mfa_enabled: true
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(200)
                const result = response.json()
                result.should.have.property('mfa_enabled', false)

                const token = await app.db.models.MFAToken.forUser(TestObjects.alice)
                should.not.exist(token)
            })
        })
    })
})
