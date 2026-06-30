const should = require('should') // eslint-disable-line
const setup = require('../../setup')

describe('GitToken Model', function () {
    let app

    before(async function () {
        const license = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZkNDFmNmRjLTBmM2QtNGFmNy1hNzk0LWIyNWFhNGJmYTliZCIsInZlciI6IjIwMjQtMDMtMDQiLCJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGdXNlIERldmVsb3BtZW50IiwibmJmIjoxNzMwNjc4NDAwLCJleHAiOjIwNzc3NDcyMDAsIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxMCwidGVhbXMiOjEwLCJpbnN0YW5jZXMiOjEwLCJtcXR0Q2xpZW50cyI6NiwidGllciI6ImVudGVycHJpc2UiLCJkZXYiOnRydWUsImlhdCI6MTczMDcyMTEyNH0.02KMRf5kogkpH3HXHVSGprUm0QQFLn21-3QIORhxFgRE9N5DIE8YnTH_f8W_21T6TlYbDUmf4PtWyj120HTM2w'
        app = await setup({ license })
    })

    after(async function () {
        await app.close()
    })

    it('stores username and caCertificate for a generic token', async function () {
        const cert = '-----BEGIN CERTIFICATE-----\nMIICertContent\n-----END CERTIFICATE-----'
        const token = await app.db.models.GitToken.create({
            name: 'generic-token',
            token: 'secret-token',
            type: 'generic',
            username: 'noley',
            caCertificate: cert,
            TeamId: app.team.id
        })
        const reloaded = await app.db.models.GitToken.byId(token.id, app.team.id)
        reloaded.should.have.property('type', 'generic')
        reloaded.should.have.property('username', 'noley')
        reloaded.should.have.property('caCertificate', cert)
    })

    it('leaves username and caCertificate null when omitted', async function () {
        const token = await app.db.models.GitToken.create({
            name: 'github-token',
            token: 'gh-token',
            type: 'github',
            TeamId: app.team.id
        })
        const reloaded = await app.db.models.GitToken.byId(token.id, app.team.id)
        should(reloaded.username).be.null()
        should(reloaded.caCertificate).be.null()
    })
})
