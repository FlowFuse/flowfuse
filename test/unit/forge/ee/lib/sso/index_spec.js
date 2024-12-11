const fastify = require('fastify')
const should = require('should') // eslint-disable-line
const setup = require('../../setup')

const FF_UTIL = require('flowforge-test-utils')
const { Roles } = FF_UTIL.require('forge/lib/roles')

describe.only('SSO Providers', function () {
    let app

    before(async function () {
        app = await setup()

        app.samlProviders = {}
        app.samlProviders.provider1 = await app.db.models.SAMLProvider.create({
            name: 'example.com',
            domainFilter: '@example.com',
            active: true,
            options: {
                cert: '-----BEGIN CERTIFICATE-----abcde-----END CERTIFICATE-----',
                entryPoint: 'https://sso.example.com/entry'
            }
        })
        app.samlProviders.provider2 = await app.db.models.SAMLProvider.create({
            name: 'inactive.com',
            domainFilter: '@inactive.com',
            active: false,
            options: {}
        })

        app.samlProviders.provider3 = await app.db.models.SAMLProvider.create({
            name: 'multilinecert',
            domainFilter: 'certtest.com',
            active: true,
            options: {
                cert: `-----BEGIN CERTIFICATE-----
                a
        b
c
        d
    e-----END CERTIFICATE-----`
            }
        })
        app.samlProviders.provider4 = await app.db.models.SAMLProvider.create({
            name: 'no-prefix-cert',
            domainFilter: 'certtest2.com',
            active: true,
            options: {
                cert: `
                a
b
c
d
    e`
            }
        })
    })

    after(async function () {
        if (app) {
            await app.close()
            app = null
        }
    })

    describe('isSSOEnabledForEmail', async function () {
        it('it checks the email domain for an active provider', async function () {
            let result = await app.sso.isSSOEnabledForEmail('test@example.com')
            result.should.be.true()

            result = await app.sso.isSSOEnabledForEmail('test@ExAmple.com')
            result.should.be.true()

            result = await app.sso.isSSOEnabledForEmail('test@inactive.com')
            result.should.be.false()

            result = await app.sso.isSSOEnabledForEmail('test@unknown.com')
            result.should.be.false()
        })
    })

    describe('getProviderForEmail', async function () {
        it('gets provider id for known domain', async function () {
            const providerId = await app.sso.getProviderForEmail('test@ExAmple.com')
            providerId.should.equal(app.samlProviders.provider1.hashid)
        })
        it('returns null for unknown domain', async function () {
            const providerId = await app.sso.getProviderForEmail('test@unknown.com')
            should.not.exist(providerId)
        })
        it('returns null for inactive domain', async function () {
            const providerId = await app.sso.getProviderForEmail('test@inactive.com')
            should.not.exist(providerId)
        })
    })

    describe('getProviderOptions', async function () {
        it('gets provider options for known provider', async function () {
            const result = await app.sso.getProviderOptions(app.samlProviders.provider1.hashid)
            result.should.have.only.keys('issuer', 'callbackUrl', 'cert', 'entryPoint')
            result.issuer.should.equal(`http://localhost:3000/ee/sso/entity/${app.samlProviders.provider1.hashid}`)
            result.callbackUrl.should.equal('http://localhost:3000/ee/sso/login/callback')
            result.cert.should.equal('abcde')
            result.entryPoint.should.equal('https://sso.example.com/entry')
        })
        it('returns null for unknown provider', async function () {
            const result = await app.sso.getProviderOptions('unknown')
            should.not.exist(result)
        })
        it('handles multi-line cert', async function () {
            const result = await app.sso.getProviderOptions(app.samlProviders.provider3.hashid)
            result.cert.should.equal('abcde')
        })
        it('handles multi-line cert without header/footer', async function () {
            const result = await app.sso.getProviderOptions(app.samlProviders.provider4.hashid)
            result.cert.should.equal('abcde')
        })
    })

    describe('handleLoginRequest - SAML', async function () {
        let localApp
        beforeEach(async function () {
            localApp = fastify()
            localApp.post('/test-sso', async (request, reply) => {
                if (await app.sso.handleLoginRequest(request, reply)) {
                    return
                }
                reply.code(200).send({})
            })
            await localApp.ready()
        })
        afterEach(async function () {
            await localApp.close()
        })

        it('ignores login attempts for non sso domains - email provided', async function () {
            const response = await localApp.inject({
                method: 'POST',
                url: '/test-sso',
                payload: {
                    username: 'nick@normal.com'
                }
            })
            response.statusCode.should.equal(200)
        })
        it('ignores login attempts for non sso domains - username provided', async function () {
            const response = await localApp.inject({
                method: 'POST',
                url: '/test-sso',
                payload: {
                    username: 'randomUser'
                }
            })
            response.statusCode.should.equal(200)
        })
        it('handles sso enabled login request - email provided', async function () {
            const response = await localApp.inject({
                method: 'POST',
                url: '/test-sso',
                payload: {
                    username: 'alice@example.com'
                }
            })
            const result = response.json()
            response.statusCode.should.equal(401)
            result.should.have.property('code', 'sso_required')
            result.should.have.property('redirect')
        })
        it('handles sso enabled login request - username provided, non-admin', async function () {
            await app.db.models.User.create({ username: 'bob', name: 'Bob Solo', email: 'bob@example.com', email_verified: true, password: 'bbPassword' })
            const response = await localApp.inject({
                method: 'POST',
                url: '/test-sso',
                payload: {
                    username: 'bob'
                }
            })
            const result = response.json()
            response.statusCode.should.equal(401)
            result.should.have.property('code', 'sso_required')
            result.should.not.have.property('redirect')
            result.should.have.property('error', 'Please login with your email address')
        })
        it('skips sso requirement if sso enabled admin provides username', async function () {
            const response = await localApp.inject({
                method: 'POST',
                url: '/test-sso',
                payload: {
                    username: 'alice'
                }
            })
            response.statusCode.should.equal(200)
        })
    })

    describe('updateTeamMembership', async function () {
        const teams = {}

        before(async function () {
            teams.ATeam = app.team
            teams.BTeam = await app.factory.createTeam({ name: 'BTeam' })
            teams.CTeam = await app.factory.createTeam({ name: 'CTeam' })
            teams.DTeam = await app.factory.createTeam({ name: 'DTeam' })
        })

        beforeEach(async function () {
            await app.db.models.TeamMember.truncate()
            await teams.ATeam.addUser(app.user, { through: { role: Roles.Owner } })
            await teams.BTeam.addUser(app.user, { through: { role: Roles.Member } })
            await teams.DTeam.addUser(app.user, { through: { role: Roles.Viewer } })
        })

        it('errors if samlUser missing group assertions', async function () {
            const result = app.sso.updateTeamMembership({}, app.user, { groupAssertionName: 'ff-roles' })
            result.should.be.rejected()
            await result.catch(err => {
                err.toString().should.match(/SAML response missing ff-roles assertion/)
            })
        })

        it('applies team membership changes - all teams', async function () {
            // Apply changes to all teams
            // Covers:
            //   - Changing existing role
            //   - Removing from team
            //   - Adding to team
            //   - Already has the right role in a team

            // Starting state:
            // Alice owner ATeam
            // Alice member BTeam
            // Alice not in CTeam
            // Alice viewer in DTeam

            // Expected result:
            // Alice member ATeam (change role)
            // Alice not in BTeam (remove from team)
            // Alice owner CTeam (add to team)
            // Alice viewer DTeam (unchanged)

            await app.sso.updateTeamMembership({
                'ff-roles': [
                    'ff-ateam-member',
                    'ff-cteam-owner',
                    'ff-dteam-viewer',
                    'ff-unknownTeam-viewer'
                ]
            }, app.user, {
                groupAssertionName: 'ff-roles',
                groupAllTeams: true
            })
            ;(await app.db.models.TeamMember.getTeamMembership(app.user.id, teams.ATeam.id)).should.have.property('role', Roles.Member)
            should.not.exist(await app.db.models.TeamMember.getTeamMembership(app.user.id, teams.BTeam.id))
            ;(await app.db.models.TeamMember.getTeamMembership(app.user.id, teams.CTeam.id)).should.have.property('role', Roles.Owner)
            ;(await app.db.models.TeamMember.getTeamMembership(app.user.id, teams.DTeam.id)).should.have.property('role', Roles.Viewer)
        })
        it('applies team membership changes - restricted teams', async function () {
            // Only apply changes to teams in the groupTeams list
            // Ensure they are not in any other teams

            // Starting state:
            // Alice owner ATeam
            // Alice member BTeam
            // Alice not in CTeam
            // Alice viewer in DTeam

            // Expected result:
            // Alice member ATeam (change role)
            // Alice not in BTeam (remove from team - in allowed list)
            // Alice not in CTeam (not allowed for this SAML user)
            // Alice not in DTeam (removed from team - not in allowed list)

            await app.sso.updateTeamMembership({
                'ff-roles': [
                    'ff-ateam-member',
                    'ff-cteam-owner',
                    'ff-dteam-viewer',
                    'ff-unknownTeam-viewer'
                ]
            }, app.user, {
                groupAssertionName: 'ff-roles',
                groupTeams: ['ateam', 'bteam']
            })
            ;(await app.db.models.TeamMember.getTeamMembership(app.user.id, teams.ATeam.id)).should.have.property('role', Roles.Member)
            should.not.exist(await app.db.models.TeamMember.getTeamMembership(app.user.id, teams.BTeam.id))
            should.not.exist(await app.db.models.TeamMember.getTeamMembership(app.user.id, teams.CTeam.id))
            should.not.exist(await app.db.models.TeamMember.getTeamMembership(app.user.id, teams.DTeam.id))
        })

        it('applies team membership changes - allows unmanaged teams to be untouched', async function () {
            // Only apply changes to teams in the groupTeams list
            //  - allow them to be in other teams not managed by this configuration

            // Starting state:
            // Alice owner ATeam
            // Alice member BTeam
            // Alice not in CTeam
            // Alice viewer in DTeam

            // Expected result:
            // Alice member ATeam (change role)
            // Alice not in BTeam (remove from team - in allowed list)
            // Alice not in CTeam (unchanged)
            // Alice viewer DTeam (unchanged - 'other' team)

            await app.sso.updateTeamMembership({
                'ff-roles': [
                    'ff-ateam-member'
                ]
            }, app.user, {
                groupAssertionName: 'ff-roles',
                groupTeams: ['ateam', 'bteam'],
                groupOtherTeams: true
            })
            ;(await app.db.models.TeamMember.getTeamMembership(app.user.id, teams.ATeam.id)).should.have.property('role', Roles.Member)
            should.not.exist(await app.db.models.TeamMember.getTeamMembership(app.user.id, teams.BTeam.id))
            should.not.exist(await app.db.models.TeamMember.getTeamMembership(app.user.id, teams.CTeam.id))
            ;(await app.db.models.TeamMember.getTeamMembership(app.user.id, teams.DTeam.id)).should.have.property('role', Roles.Viewer)
        })

        it('applies highest role when multiple groups provided', async function () {
            // When multiple groups specify the same team, pick the highest role

            // Starting state:
            // Alice not in CTeam
            // Alice viewer in DTeam

            // Expected result:
            // Alice owner CTeam (add to team as owner)
            // Alice member DTeam (change to member)

            await app.sso.updateTeamMembership({
                'ff-roles': [
                    'ff-cteam-member',
                    'ff-cteam-owner',
                    'ff-dteam-member',
                    'ff-dteam-viewer'
                ]
            }, app.user, {
                groupAssertionName: 'ff-roles',
                groupAllTeams: true
            })
            ;(await app.db.models.TeamMember.getTeamMembership(app.user.id, teams.CTeam.id)).should.have.property('role', Roles.Owner)
            ;(await app.db.models.TeamMember.getTeamMembership(app.user.id, teams.DTeam.id)).should.have.property('role', Roles.Member)
        })
        it('ignores invalid role in group', async function () {
            // Validates that it ignores both unknown roles, but also roles that
            // exist but are not valid for a team membershipt (ie admin)

            // Starting state:
            // Alice owner ATeam

            // Expected result:
            // Alice owner ATeam - unchanged

            await app.sso.updateTeamMembership({
                'ff-roles': [
                    'ff-ateam-magician',
                    'ff-ateam-owner',
                    'ff-ateam-admin'
                ]
            }, app.user, {
                groupAssertionName: 'ff-roles',
                groupAllTeams: true
            })
            ;(await app.db.models.TeamMember.getTeamMembership(app.user.id, teams.ATeam.id)).should.have.property('role', Roles.Owner)
        })
        it('strip prefix and suffix from SAML groups', async function () {
            // This should remove ownership from Alice in Team A

            // Starting state:
            // Alice owner ATeam

            // Expected result:
            // Alice owner ATeam - unchanged
            await app.sso.updateTeamMembership({
                'ff-roles': [
                    'test_ff-ateam-magician_err',
                    'test_ff-ateam-member_test',
                    'test_ff-bteam-owner_test',
                    'ff-ateam-admin_test'
                ]
            }, app.user, {
                groupAssertionName: 'ff-roles',
                groupAllTeams: true,
                groupPrefixLength: 5,
                groupSuffixLength: 5
            })
            ;(await app.db.models.TeamMember.getTeamMembership(app.user.id, teams.ATeam.id)).should.have.property('role', Roles.Member)
            ;(await app.db.models.TeamMember.getTeamMembership(app.user.id, teams.BTeam.id)).should.have.property('role', Roles.Owner)
        })
    })
})
